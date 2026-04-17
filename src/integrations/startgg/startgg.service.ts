import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
    Division,
    Entrant,
    ExternalMapping,
    Match,
    MatchResult,
    Participant,
    Phase,
    Player,
    Tournament,
} from '@persistence/entities';
import { DivisionService } from '@tournament/services/division.service';
import { EntrantService } from '@tournament/services/entrant.service';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';
import { ParticipantService } from '@tournament/services/participant.service';
import { PhaseService } from '@tournament/services/phase.service';
import { PlayerService } from '@player/player.service';
import { TournamentService } from '@tournament/services/tournament.service';
import { CreateDivisionDto, CreatePhaseDto } from '@tournament/dtos';
import { StartggClient } from './startgg.client';
import { StartggImportDto, StartggImportPreviewDto } from './startgg.dto';
import {
    StartggEntrantNode,
    StartggEventSnapshot,
    StartggPhaseGroupNode,
    StartggParticipantNode,
    StartggPhaseNode,
    StartggSetNode,
} from './startgg.types';

type AuthUser = {
    id: string;
    isAdmin?: boolean;
};

type StartggMappingCache = {
    byExternalKey: Map<string, ExternalMapping>;
    dirtyByExternalKey: Map<string, ExternalMapping>;
};

type ImportedMatchSyncResult = {
    matchesBySetId: Map<string, Match>;
    touchedPhaseIds: Set<number>;
};

@Injectable()
export class StartggService {
    private readonly logger = new Logger(StartggService.name);
    private readonly snapshotCacheTtlMs = 5 * 60 * 1000;
    private readonly snapshotCache = new Map<string, { snapshot: StartggEventSnapshot; expiresAt: number }>();
    private readonly bulkSaveChunkSize = 100;

    constructor(
        private readonly startggClient: StartggClient,
        private readonly tournamentService: TournamentService,
        private readonly divisionService: DivisionService,
        private readonly phaseService: PhaseService,
        private readonly participantService: ParticipantService,
        private readonly entrantService: EntrantService,
        private readonly playerService: PlayerService,
        private readonly uiUpdateGateway: UiUpdateGateway,
        @InjectRepository(Tournament)
        private readonly tournamentRepository: Repository<Tournament>,
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Participant)
        private readonly participantRepository: Repository<Participant>,
        @InjectRepository(Entrant)
        private readonly entrantRepository: Repository<Entrant>,
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
        @InjectRepository(MatchResult)
        private readonly matchResultRepository: Repository<MatchResult>,
        @InjectRepository(ExternalMapping)
        private readonly externalMappingRepository: Repository<ExternalMapping>,
    ) {}

    async previewImport(dto: StartggImportPreviewDto, user?: AuthUser) {
        const previewStartedAt = Date.now();
        this.logger.log(`[timing] start previewImport eventSlug=${dto.eventSlug} targetTournamentId=${dto.targetTournamentId ?? 'none'}`);
        if (dto.targetTournamentId) {
            await this.timeOperation(
                `previewImport.assertCanEditTournament tournamentId=${dto.targetTournamentId}`,
                () => this.assertCanEditTournament(dto.targetTournamentId!, user),
            );
        }

        const snapshot = await this.timeOperation(
            `previewImport.buildEventSnapshot eventSlug=${dto.eventSlug}`,
            () => this.buildEventSnapshot(dto.eventSlug),
        );
        const context = dto.targetTournamentId
            ? await this.timeOperation(
                `previewImport.buildLocalContext tournamentId=${dto.targetTournamentId}`,
                () => this.buildLocalContext(dto.targetTournamentId!),
            )
            : null;

        const remotePhases = this.timeSyncOperation('previewImport.getEffectiveRemotePhases', () => this.getEffectiveRemotePhases(snapshot));
        const seedByEntrantId = this.timeSyncOperation('previewImport.buildSeedMap', () => this.buildSeedMap(snapshot));
        const divisionMapping = context
            ? this.findMappingInList(context.mappings, 'division', 'event', snapshot.id)
            : null;
        const mappedDivision = divisionMapping
            ? context.divisionsById.get(Number(divisionMapping.localId)) ?? null
            : null;

        const participants = snapshot.entrants.flatMap((entrant) => entrant.participants);
        const uniqueParticipants = this.timeSyncOperation(
            'previewImport.uniqueParticipants',
            () => this.uniqueBy(participants, (participant) => participant.id),
        );

        const participantPlan = this.timeSyncOperation('previewImport.participantPlan', () => uniqueParticipants.map((participant) => {
            const mappedParticipant = context
                ? this.findMappedLocalEntity(context.mappings, 'participant', 'participant', participant.id, context.participantsById)
                : null;
            if (mappedParticipant) {
                return {
                    externalId: participant.id,
                    gamerTag: participant.gamerTag,
                    action: 'mapped',
                    localParticipantId: mappedParticipant.id,
                    localPlayerId: mappedParticipant.player?.id ?? null,
                };
            }

            const matchedPlayer = context?.playersByNormalizedName.get(this.normalizeName(participant.gamerTag)) ?? null;
            if (!context) {
                return {
                    externalId: participant.id,
                    gamerTag: participant.gamerTag,
                    action: 'unscoped-preview',
                    localParticipantId: null,
                    localPlayerId: matchedPlayer?.id ?? null,
                };
            }

            if (matchedPlayer) {
                const existingParticipant = Array.from(context.participantsById.values())
                    .find((candidate) => candidate.player?.id === matchedPlayer.id) ?? null;
                return {
                    externalId: participant.id,
                    gamerTag: participant.gamerTag,
                    action: existingParticipant ? 'match-existing-participant' : 'create-participant',
                    localParticipantId: existingParticipant?.id ?? null,
                    localPlayerId: matchedPlayer.id,
                };
            }

            return {
                externalId: participant.id,
                gamerTag: participant.gamerTag,
                action: 'create-player-and-participant',
                localParticipantId: null,
                localPlayerId: null,
            };
        }));

        const entrantPlan = this.timeSyncOperation('previewImport.entrantPlan', () => snapshot.entrants.map((entrant) => {
            const mappedEntrant = context
                ? this.findMappedLocalEntity(context.mappings, 'entrant', 'entrant', entrant.id, context.entrantsById)
                : null;
            const resolvedParticipants = entrant.participants.map((participant) =>
                participantPlan.find((plan) => plan.externalId === participant.id),
            );
            const isTeam = entrant.participants.length > 1;
            const existingSinglesEntrant = !mappedEntrant && mappedDivision && !isTeam && resolvedParticipants[0]?.localParticipantId
                ? (mappedDivision.entrants ?? []).find((candidate) =>
                    candidate.participants?.some((participant) => participant.id === resolvedParticipants[0].localParticipantId),
                ) ?? null
                : null;

            return {
                externalId: entrant.id,
                name: entrant.name,
                type: isTeam ? 'team' : 'player',
                seedNum: seedByEntrantId.get(entrant.id) ?? null,
                action: mappedEntrant
                    ? 'mapped'
                    : existingSinglesEntrant
                        ? 'match-existing-entrant'
                        : isTeam
                            ? 'create-team-entrant'
                            : 'create-entrant',
                localEntrantId: mappedEntrant?.id ?? existingSinglesEntrant?.id ?? null,
                participantExternalIds: entrant.participants.map((participant) => participant.id),
            };
        }));

        const phasePlan = this.timeSyncOperation('previewImport.phasePlan', () => remotePhases.map((phase) => {
            const mappedPhase = context
                ? this.findMappedLocalEntity(context.mappings, 'phase', 'phase', phase.id, context.phasesById)
                : null;
            return {
                externalId: phase.id,
                name: phase.name,
                action: mappedPhase ? 'mapped' : 'create-phase',
                localPhaseId: mappedPhase?.id ?? null,
            };
        }));

        const snapshotSets = this.timeSyncOperation('previewImport.flattenSets', () => this.getSnapshotSets(snapshot));
        const defaultPhaseId = remotePhases[0]?.id ?? `event:${snapshot.id}:default-phase`;
        const matchPlan = this.timeSyncOperation('previewImport.matchPlan', () => snapshotSets.map((set) => {
            const mappedMatch = context
                ? this.findMappedLocalEntity(context.mappings, 'match', 'set', set.id, context.matchesById)
                : null;
            return {
                externalId: set.id,
                name: this.buildMatchName(set),
                action: mappedMatch ? 'mapped' : 'create-match',
                localMatchId: mappedMatch?.id ?? null,
                phaseExternalId: set.phaseId ?? defaultPhaseId,
                entrantExternalIds: set.entrants.map((entrant) => entrant.id),
            };
        }));

        const result = {
            event: {
                id: snapshot.id,
                name: snapshot.name,
                slug: snapshot.slug,
                tournament: snapshot.tournament ?? null,
                phases: snapshot.phases.map((phase) => ({
                    id: phase.id,
                    name: phase.name,
                })),
            },
            targetTournamentId: dto.targetTournamentId ?? null,
            mode: dto.mode ?? 'create-division',
            division: {
                externalId: snapshot.id,
                name: snapshot.name,
                action: mappedDivision ? 'mapped' : 'create-division',
                localDivisionId: mappedDivision?.id ?? null,
            },
            counts: {
                participants: participantPlan.length,
                entrants: entrantPlan.length,
                phases: phasePlan.length,
                matches: matchPlan.length,
            },
            participants: participantPlan,
            entrants: entrantPlan,
            phases: phasePlan,
            matches: matchPlan,
        };

        this.logger.log(`[timing] complete previewImport eventSlug=${dto.eventSlug} durationMs=${Date.now() - previewStartedAt}`);
        return result;
    }

    async importEvent(dto: StartggImportDto, user?: AuthUser) {
        const importStartedAt = Date.now();
        this.logger.log(`[timing] start importEvent eventSlug=${dto.eventSlug} tournamentId=${dto.targetTournamentId}`);
        await this.timeOperation(
            `importEvent.assertCanEditTournament tournamentId=${dto.targetTournamentId}`,
            () => this.assertCanEditTournament(dto.targetTournamentId, user),
        );

        const snapshot = await this.timeOperation(
            `importEvent.buildEventSnapshot eventSlug=${dto.eventSlug}`,
            () => this.buildEventSnapshot(dto.eventSlug),
        );
        const tournament = await this.timeOperation(
            `importEvent.loadTournament tournamentId=${dto.targetTournamentId}`,
            () => this.tournamentRepository.findOneBy({ id: dto.targetTournamentId }),
        );
        if (!tournament) throw new NotFoundException(`Tournament ${dto.targetTournamentId} not found`);

        const seedByEntrantId = this.timeSyncOperation('importEvent.buildSeedMap', () => this.buildSeedMap(snapshot));
        const remotePhases = this.timeSyncOperation('importEvent.getEffectiveRemotePhases', () => this.getEffectiveRemotePhases(snapshot));
        const snapshotSets = this.timeSyncOperation('importEvent.flattenSets', () => this.getSnapshotSets(snapshot));
        const [mappingCache, playersByNormalizedName] = await this.timeOperation(
            'importEvent.loadCaches',
            async () => {
                const [mappings, allPlayers] = await Promise.all([
                    this.externalMappingRepository.find({ where: { provider: 'startgg' } }),
                    this.playerService.findAll(),
                ]);

                return [
                    this.createMappingCache(mappings),
                    new Map<string, Player>(allPlayers.map((player) => [this.normalizeName(player.playerName), player])),
                ] as const;
            },
        );

        const division = await this.timeOperation(
            `importEvent.ensureDivision tournamentId=${tournament.id}`,
            () => this.ensureDivision(snapshot, tournament.id, mappingCache),
        );
        if (snapshot.tournament?.id) {
            this.timeSyncOperation(
                `importEvent.queueTournamentMapping tournamentId=${tournament.id}`,
                () => this.cacheMapping(mappingCache, {
                    provider: 'startgg',
                    localType: 'tournament',
                    localId: String(tournament.id),
                    externalType: 'tournament',
                    externalId: snapshot.tournament.id,
                    externalSlug: snapshot.tournament.slug ?? null,
                    metadata: { eventSlug: snapshot.slug },
                }),
            );
        }

        const participantByExternalId = new Map<string, Participant>();
        const uniqueParticipants = this.timeSyncOperation(
            'importEvent.uniqueParticipants',
            () => this.uniqueBy(snapshot.entrants.flatMap((entrant) => entrant.participants), (node) => node.id),
        );
        await this.timeOperation(`importEvent.ensureParticipants count=${uniqueParticipants.length}`, async () => {
            for (const participant of uniqueParticipants) {
                const localParticipant = await this.ensureParticipant(
                    dto.targetTournamentId,
                    participant,
                    mappingCache,
                    playersByNormalizedName,
                );
                participantByExternalId.set(participant.id, localParticipant);
            }
        });

        const entrantByExternalId = new Map<string, Entrant>();
        await this.timeOperation(`importEvent.ensureEntrants count=${snapshot.entrants.length}`, async () => {
            for (const entrant of snapshot.entrants) {
                const localEntrant = await this.ensureEntrant(
                    division.id,
                    entrant,
                    participantByExternalId,
                    seedByEntrantId.get(entrant.id) ?? null,
                    mappingCache,
                );
                entrantByExternalId.set(entrant.id, localEntrant);
            }
        });

        const localPhases = new Map<string, Phase>();
        await this.timeOperation(`importEvent.ensurePhases count=${remotePhases.length}`, async () => {
            for (const phase of remotePhases) {
                const localPhase = await this.ensurePhase(division.id, phase, mappingCache);
                localPhases.set(phase.id, localPhase);
            }
        });

        const fallbackPhase = remotePhases[0]
            ? localPhases.get(remotePhases[0].id) ?? null
            : await this.timeOperation(
                'importEvent.ensureFallbackPhase',
                () => this.ensurePhase(division.id, {
                    id: `event:${snapshot.id}:default-phase`,
                    name: `${snapshot.name} Imported Phase`,
                    seeds: [],
                    phaseGroups: [],
                }, mappingCache),
            );
        if (!fallbackPhase) {
            throw new NotFoundException(`Could not resolve a local phase for imported event ${snapshot.id}`);
        }

        const { matchesBySetId: localMatches, touchedPhaseIds } = await this.timeOperation(
            `importEvent.syncMatches count=${snapshotSets.length}`,
            () => this.syncImportedMatches(snapshotSets, localPhases, fallbackPhase, entrantByExternalId, mappingCache),
        );

        await this.timeOperation(
            `importEvent.flushMappings count=${mappingCache.dirtyByExternalKey.size}`,
            () => this.flushMappingCache(mappingCache),
        );

        await this.timeOperation(
            `importEvent.emitPhaseUpdates count=${touchedPhaseIds.size}`,
            () => Promise.all(Array.from(touchedPhaseIds).map((phaseId) => this.uiUpdateGateway.emitPhaseUpdateByPhaseId(phaseId))),
        );

        const result = {
            tournamentId: tournament.id,
            divisionId: division.id,
            imported: {
                participants: participantByExternalId.size,
                entrants: entrantByExternalId.size,
                phases: localPhases.size || (fallbackPhase ? 1 : 0),
                matches: localMatches.size,
            },
        };

        this.logger.log(`[timing] complete importEvent eventSlug=${dto.eventSlug} tournamentId=${dto.targetTournamentId} durationMs=${Date.now() - importStartedAt}`);
        return result;
    }

    private async buildEventSnapshot(eventSlug: string): Promise<StartggEventSnapshot> {
        const cached = this.snapshotCache.get(eventSlug);
        if (cached && cached.expiresAt > Date.now()) {
            this.logger.log(`[timing] buildEventSnapshot cache-hit eventSlug=${eventSlug}`);
            return cached.snapshot;
        }

        const event = await this.timeOperation(
            `buildEventSnapshot.getEventBySlug eventSlug=${eventSlug}`,
            () => this.startggClient.getEventBySlug(eventSlug),
        );
        const entrants = await this.timeOperation(
            `buildEventSnapshot.getEventEntrants eventId=${event.id}`,
            () => this.startggClient.getEventEntrants(event.id),
        );

        const phaseRefs = event.phases ?? [];
        const phaseGroupLists = await this.timeOperation(
            `buildEventSnapshot.getPhaseGroups phaseCount=${phaseRefs.length}`,
            () => Promise.all(phaseRefs.map((phase) => this.startggClient.getPhaseGroups(phase.id))),
        );
        const seedLists = await this.timeOperation(
            `buildEventSnapshot.getPhaseSeeds phaseCount=${phaseRefs.length}`,
            () => Promise.all(phaseRefs.map((phase) => this.startggClient.getPhaseSeeds(phase.id))),
        );
        const phases = await this.timeOperation(
            `buildEventSnapshot.attachPhaseGroupsAndSeeds phaseCount=${phaseRefs.length}`,
            () => Promise.all(phaseRefs.map(async (phase, index) => {
                const phaseGroups = phaseGroupLists[index] ?? [];
                const setsByPhaseGroupId = await this.getSetsFromPhaseGroups(phaseGroups);
                return {
                    id: phase.id,
                    name: phase.name,
                    seeds: seedLists[index] ?? [],
                    phaseGroups: phaseGroups.map((phaseGroup) => ({
                        ...phaseGroup,
                        sets: setsByPhaseGroupId.get(phaseGroup.id) ?? [],
                    })),
                };
            })),
        );

        const snapshot: StartggEventSnapshot = {
            id: event.id,
            name: event.name,
            slug: event.slug,
            tournament: event.tournament ?? null,
            entrants,
            phases,
        };

        this.snapshotCache.set(eventSlug, {
            snapshot,
            expiresAt: Date.now() + this.snapshotCacheTtlMs,
        });

        return snapshot;
    }

    private async buildLocalContext(tournamentId: number) {
        const [tournament, divisions, allPlayers, mappings] = await this.timeOperation(
            `buildLocalContext.loadBaseEntities tournamentId=${tournamentId}`,
            () => Promise.all([
                this.tournamentRepository.findOne({
                    where: { id: tournamentId },
                    relations: {
                        participants: {
                            player: true,
                            account: true,
                        },
                    },
                }),
                this.divisionRepository.find({
                    where: { tournament: { id: tournamentId } },
                    relations: {
                        entrants: {
                            participants: {
                                player: true,
                            },
                        },
                        phases: true,
                    },
                }),
                this.playerService.findAll(),
                this.externalMappingRepository.find({ where: { provider: 'startgg' } }),
            ]),
        );

        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const participantsById = new Map<number, Participant>((tournament.participants ?? []).map((participant) => [participant.id, participant]));
        const entrants = divisions.flatMap((division) => division.entrants ?? []);
        const phases = divisions.flatMap((division) => division.phases ?? []);
        const matches = await this.timeOperation(
            `buildLocalContext.loadMatches tournamentId=${tournamentId}`,
            () => this.matchRepository.find({
                where: { phase: { division: { tournament: { id: tournamentId } } } },
            }),
        );

        return {
            tournament,
            divisionsById: new Map<number, Division>(divisions.map((division) => [division.id, division])),
            phasesById: new Map<number, Phase>(phases.map((phase) => [phase.id, phase])),
            participantsById,
            entrantsById: new Map<number, Entrant>(entrants.map((entrant) => [entrant.id, entrant])),
            matchesById: new Map<number, Match>(matches.map((match) => [match.id, match])),
            playersByNormalizedName: new Map<string, Player>(allPlayers.map((player) => [this.normalizeName(player.playerName), player])),
            mappings,
        };
    }

    private async ensureDivision(
        snapshot: StartggEventSnapshot,
        tournamentId: number,
        mappingCache: StartggMappingCache,
    ): Promise<Division> {
        const existingMapping = this.findMappingInCache(mappingCache, 'division', 'event', snapshot.id);

        let division = existingMapping
            ? await this.divisionRepository.findOne({
                where: { id: Number(existingMapping.localId) },
                relations: { tournament: true, entrants: true, phases: true },
            })
            : null;

        if (!division) {
            const dto = new CreateDivisionDto();
            dto.name = snapshot.name;
            dto.tournamentId = tournamentId;
            division = await this.divisionService.create(dto);
        }

        this.cacheMapping(mappingCache, {
            provider: 'startgg',
            localType: 'division',
            localId: String(division.id),
            externalType: 'event',
            externalId: snapshot.id,
            externalSlug: snapshot.slug,
            metadata: {
                tournamentId,
                startggTournamentId: snapshot.tournament?.id ?? null,
            },
        });

        return division;
    }

    private async ensureParticipant(
        tournamentId: number,
        participant: StartggParticipantNode,
        mappingCache: StartggMappingCache,
        playersByNormalizedName: Map<string, Player>,
    ): Promise<Participant> {
        const existingMapping = this.findMappingInCache(mappingCache, 'participant', 'participant', participant.id);

        let localParticipant = existingMapping
            ? await this.participantRepository.findOne({
                where: { id: Number(existingMapping.localId), tournament: { id: tournamentId } },
                relations: { player: true, tournament: true, account: true },
            })
            : null;

        if (!localParticipant) {
            const normalizedName = this.normalizeName(participant.gamerTag);
            const existingPlayer = playersByNormalizedName.get(normalizedName) ?? null;
            const player = existingPlayer ?? await this.playerService.create(participant.gamerTag);
            playersByNormalizedName.set(this.normalizeName(player.playerName), player);
            localParticipant = await this.participantService.ensureForPlayer(tournamentId, player.id, ['competitor']);
        }

        this.cacheMapping(mappingCache, {
            provider: 'startgg',
            localType: 'participant',
            localId: String(localParticipant.id),
            externalType: 'participant',
            externalId: participant.id,
            metadata: {
                gamerTag: participant.gamerTag,
                tournamentId,
            },
        });

        return localParticipant;
    }

    private async ensureEntrant(
        divisionId: number,
        entrant: StartggEntrantNode,
        participantByExternalId: Map<string, Participant>,
        seedNum: number | null,
        mappingCache: StartggMappingCache,
    ): Promise<Entrant> {
        const existingMapping = this.findMappingInCache(mappingCache, 'entrant', 'entrant', entrant.id);

        let localEntrant = existingMapping
            ? await this.entrantRepository.findOne({
                where: { id: Number(existingMapping.localId), division: { id: divisionId } },
                relations: { participants: { player: true }, division: true },
            })
            : null;

        if (!localEntrant && entrant.participants.length === 1) {
            const participant = participantByExternalId.get(entrant.participants[0].id);
            if (!participant) {
                throw new NotFoundException(`No local participant resolved for start.gg participant ${entrant.participants[0].id}`);
            }
            localEntrant = await this.entrantService.addSinglesEntrant(divisionId, participant.id, seedNum);
        }

        if (!localEntrant) {
            const division = await this.divisionRepository.findOneBy({ id: divisionId });
            if (!division) throw new NotFoundException(`Division ${divisionId} not found`);

            localEntrant = new Entrant();
            localEntrant.division = division;
            localEntrant.name = entrant.name;
            localEntrant.type = entrant.participants.length > 1 ? 'team' : 'player';
            localEntrant.seedNum = seedNum;
            localEntrant.status = 'active';
            localEntrant.participants = entrant.participants
                .map((participant) => participantByExternalId.get(participant.id))
                .filter(Boolean);
        } else {
            localEntrant.name = entrant.name;
            localEntrant.seedNum = seedNum;
            localEntrant.status = 'active';
            if (entrant.participants.length > 1) {
                localEntrant.type = 'team';
                localEntrant.participants = entrant.participants
                    .map((participant) => participantByExternalId.get(participant.id))
                    .filter(Boolean);
            }
        }

        localEntrant = await this.entrantRepository.save(localEntrant);

        this.cacheMapping(mappingCache, {
            provider: 'startgg',
            localType: 'entrant',
            localId: String(localEntrant.id),
            externalType: 'entrant',
            externalId: entrant.id,
            metadata: {
                divisionId,
                participantExternalIds: entrant.participants.map((participant) => participant.id),
            },
        });

        return localEntrant;
    }

    private async ensurePhase(
        divisionId: number,
        phase: StartggPhaseNode,
        mappingCache: StartggMappingCache,
    ): Promise<Phase> {
        const existingMapping = this.findMappingInCache(mappingCache, 'phase', 'phase', phase.id);

        let localPhase = existingMapping
            ? await this.phaseRepository.findOne({
                where: { id: Number(existingMapping.localId), division: { id: divisionId } },
                relations: { division: true },
            })
            : null;

        if (!localPhase) {
            const dto = new CreatePhaseDto();
            dto.name = phase.name;
            dto.divisionId = divisionId;
            localPhase = await this.phaseService.create(dto);
        }

        this.cacheMapping(mappingCache, {
            provider: 'startgg',
            localType: 'phase',
            localId: String(localPhase.id),
            externalType: 'phase',
            externalId: phase.id,
            metadata: {
                divisionId,
                name: phase.name,
            },
        });

        return localPhase;
    }

    private async syncImportedMatches(
        sets: StartggSetNode[],
        localPhases: Map<string, Phase>,
        fallbackPhase: Phase,
        entrantByExternalId: Map<string, Entrant>,
        mappingCache: StartggMappingCache,
    ): Promise<ImportedMatchSyncResult> {
        const existingMatchIds = sets
            .map((set) => this.findMappingInCache(mappingCache, 'match', 'set', set.id)?.localId)
            .filter((id): id is string => Boolean(id))
            .map((id) => Number(id));
        const existingMatches = existingMatchIds.length > 0
            ? await this.matchRepository.find({
                where: { id: In(existingMatchIds) },
                relations: { matchResult: true },
            })
            : [];
        const existingMatchesById = new Map<number, Match>(existingMatches.map((match) => [match.id, match]));
        const matchesBySetId = new Map<string, Match>();
        const touchedPhaseIds = new Set<number>();

        const stagedMatches = sets.map((set) => {
            const existingMapping = this.findMappingInCache(mappingCache, 'match', 'set', set.id);
            const existingMatch = existingMapping
                ? existingMatchesById.get(Number(existingMapping.localId)) ?? null
                : null;
            const targetPhase = (set.phaseId ? localPhases.get(set.phaseId) : null) ?? fallbackPhase;
            const match = existingMatch ?? this.matchRepository.create();

            match.name = this.buildMatchName(set);
            match.subtitle = set.phaseGroupName ?? null;
            match.notes = `Imported from start.gg set ${set.id}`;
            match.scoringSystem = 'EurocupScoreCalculator';
            match.phase = Promise.resolve(targetPhase);
            match.entrants = set.entrants
                .map((entrant) => entrantByExternalId.get(entrant.id))
                .filter((entrant): entrant is Entrant => Boolean(entrant));
            match.targetPaths = existingMatch?.targetPaths ?? [];
            match.sourcePaths = existingMatch?.sourcePaths ?? [];

            touchedPhaseIds.add(targetPhase.id);
            matchesBySetId.set(set.id, match);
            return match;
        });

        const savedMatches = await this.matchRepository.save(stagedMatches, { chunk: this.bulkSaveChunkSize });
        savedMatches.forEach((match, index) => matchesBySetId.set(sets[index].id, match));

        for (const set of sets) {
            const localMatch = matchesBySetId.get(set.id);
            if (!localMatch) continue;

            this.cacheMapping(mappingCache, {
                provider: 'startgg',
                localType: 'match',
                localId: String(localMatch.id),
                externalType: 'set',
                externalId: set.id,
                metadata: {
                    phaseExternalId: set.phaseId ?? null,
                    entrantExternalIds: set.entrants.map((entrant) => entrant.id),
                },
            });
        }

        const resultIdsToDelete = new Set<number>();
        for (const set of sets) {
            const localMatch = matchesBySetId.get(set.id);
            if (!localMatch) continue;

            localMatch.targetPaths = [];
            localMatch.sourcePaths = [];
        }

        for (const set of sets) {
            const localMatch = matchesBySetId.get(set.id);
            if (!localMatch) continue;

            for (const slot of set.slots ?? []) {
                if (slot.prereqType !== 'set' || !slot.prereqId) {
                    continue;
                }

                const sourceMatch = matchesBySetId.get(slot.prereqId);
                const routeIndex = (slot.prereqPlacement ?? 1) - 1;
                if (!sourceMatch || routeIndex < 0) {
                    continue;
                }

                const sourceTargetPaths = [...(sourceMatch.targetPaths ?? [])];
                while (sourceTargetPaths.length <= routeIndex) {
                    sourceTargetPaths.push(0);
                }
                sourceTargetPaths[routeIndex] = localMatch.id;
                sourceMatch.targetPaths = sourceTargetPaths;

                const nextSourcePaths = new Set<number>(localMatch.sourcePaths ?? []);
                nextSourcePaths.add(sourceMatch.id);
                localMatch.sourcePaths = Array.from(nextSourcePaths);
            }

            const playerPoints = this.buildImportedPlayerPoints(set, entrantByExternalId);
            if (playerPoints.length === 0) {
                if (localMatch.matchResult?.id) {
                    resultIdsToDelete.add(localMatch.matchResult.id);
                }
                localMatch.matchResult = null;
                continue;
            }

            const matchResult = localMatch.matchResult ?? this.matchResultRepository.create();
            matchResult.playerPoints = playerPoints;
            matchResult.match = localMatch;
            localMatch.matchResult = matchResult;
        }

        await this.matchRepository.save(Array.from(matchesBySetId.values()), { chunk: this.bulkSaveChunkSize });

        if (resultIdsToDelete.size > 0) {
            await this.matchResultRepository.delete(Array.from(resultIdsToDelete));
        }

        return {
            matchesBySetId,
            touchedPhaseIds,
        };
    }

    private buildImportedPlayerPoints(
        set: StartggSetNode,
        entrantByExternalId: Map<string, Entrant>,
    ): Array<{ playerId: number; points: number }> {
        return (set.slots ?? [])
            .filter((slot) => slot.entrant?.id)
            .map((slot) => {
                const localEntrant = entrantByExternalId.get(slot.entrant!.id);
                const playerId = localEntrant?.participants?.[0]?.player?.id;
                if (!playerId) {
                    return null;
                }

                return {
                    playerId,
                    points: slot.standing?.score ?? 0,
                    placement: slot.standing?.placement ?? Number.MAX_SAFE_INTEGER,
                };
            })
            .filter((entry): entry is { playerId: number; points: number; placement: number } => Boolean(entry))
            .sort((left, right) => left.placement - right.placement || right.points - left.points || left.playerId - right.playerId)
            .map(({ playerId, points }) => ({ playerId, points }));
    }

    private async getSetsFromPhaseGroups(phaseGroups: StartggPhaseGroupNode[]): Promise<Map<string, StartggSetNode[]>> {
        const setLists = await Promise.all(
            phaseGroups.map((phaseGroup) =>
                this.timeOperation(
                    `getSetsFromPhaseGroups phaseGroupId=${phaseGroup.id}`,
                    () => this.startggClient.getPhaseGroupSets(phaseGroup),
                ),
            ),
        );

        return new Map<string, StartggSetNode[]>(
            phaseGroups.map((phaseGroup, index) => [
                phaseGroup.id,
                this.uniqueBy(setLists[index] ?? [], (set) => set.id),
            ]),
        );
    }

    private buildSeedMap(snapshot: StartggEventSnapshot): Map<string, number> {
        const seedByEntrantId = new Map<string, number>();
        for (const phase of snapshot.phases) {
            for (const seed of phase.seeds) {
                const entrantId = seed.entrantId;
                if (!entrantId) continue;
                const existing = seedByEntrantId.get(entrantId);
                if (existing === undefined || seed.seedNum < existing) {
                    seedByEntrantId.set(entrantId, seed.seedNum);
                }
            }
        }
        return seedByEntrantId;
    }

    private getSnapshotSets(snapshot: StartggEventSnapshot): StartggSetNode[] {
        return snapshot.phases.flatMap((phase) =>
            phase.phaseGroups.flatMap((phaseGroup) => phaseGroup.sets ?? []),
        );
    }

    private getEffectiveRemotePhases(snapshot: StartggEventSnapshot): StartggPhaseNode[] {
        const phases = [...snapshot.phases];
        const knownIds = new Set(phases.map((phase) => phase.id));

        for (const set of this.getSnapshotSets(snapshot)) {
            if (set.phaseId && !knownIds.has(set.phaseId)) {
                phases.push({
                    id: set.phaseId,
                    name: set.phaseName ?? `Phase ${set.phaseId}`,
                    seeds: [],
                    phaseGroups: [],
                });
                knownIds.add(set.phaseId);
            }
        }

        if (phases.length === 0) {
            phases.push({
                id: `event:${snapshot.id}:default-phase`,
                name: `${snapshot.name} Imported Phase`,
                seeds: [],
                phaseGroups: [],
            });
        }

        return phases;
    }

    private buildMatchName(set: StartggSetNode): string {
        return set.fullRoundText?.trim() || `start.gg Set ${set.id}`;
    }

    private createMappingCache(mappings: ExternalMapping[]): StartggMappingCache {
        const byExternalKey = new Map<string, ExternalMapping>();

        for (const mapping of mappings) {
            byExternalKey.set(this.getMappingExternalKey(mapping.localType, mapping.externalType, mapping.externalId), mapping);
        }

        return {
            byExternalKey,
            dirtyByExternalKey: new Map<string, ExternalMapping>(),
        };
    }

    private findMappingInCache(
        mappingCache: StartggMappingCache,
        localType: ExternalMapping['localType'],
        externalType: ExternalMapping['externalType'],
        externalId: string,
    ): ExternalMapping | null {
        return mappingCache.byExternalKey.get(this.getMappingExternalKey(localType, externalType, externalId)) ?? null;
    }

    private cacheMapping(mappingCache: StartggMappingCache, partial: Partial<ExternalMapping>): ExternalMapping {
        if (!partial.provider || !partial.localType || !partial.localId || !partial.externalType || !partial.externalId) {
            throw new NotFoundException('Cannot cache external mapping without provider, types, and ids');
        }

        const key = this.getMappingExternalKey(partial.localType, partial.externalType, partial.externalId);
        const existing = mappingCache.byExternalKey.get(key) ?? null;

        const mapping = existing
            ? Object.assign(existing, {
                localId: partial.localId,
                externalSlug: partial.externalSlug ?? existing.externalSlug ?? null,
                metadata: {
                    ...(existing.metadata ?? {}),
                    ...(partial.metadata ?? {}),
                },
            })
            : this.externalMappingRepository.create({
                provider: partial.provider,
                localType: partial.localType,
                localId: partial.localId,
                externalType: partial.externalType,
                externalId: partial.externalId,
                externalSlug: partial.externalSlug ?? null,
                metadata: partial.metadata ?? null,
            });

        mappingCache.byExternalKey.set(key, mapping);
        mappingCache.dirtyByExternalKey.set(key, mapping);
        return mapping;
    }

    private async flushMappingCache(mappingCache: StartggMappingCache): Promise<void> {
        if (mappingCache.dirtyByExternalKey.size === 0) {
            return;
        }

        await this.externalMappingRepository.save(Array.from(mappingCache.dirtyByExternalKey.values()));
        mappingCache.dirtyByExternalKey.clear();
    }

    private getMappingExternalKey(
        localType: ExternalMapping['localType'],
        externalType: ExternalMapping['externalType'],
        externalId: string,
    ): string {
        return `${localType}:${externalType}:${externalId}`;
    }

    private findMappingInList(
        mappings: ExternalMapping[],
        localType: ExternalMapping['localType'],
        externalType: ExternalMapping['externalType'],
        externalId: string,
    ): ExternalMapping | null {
        return mappings.find((mapping) =>
            mapping.localType === localType &&
            mapping.externalType === externalType &&
            mapping.externalId === externalId,
        ) ?? null;
    }

    private findMappedLocalEntity<T extends { id: number }>(
        mappings: ExternalMapping[],
        localType: ExternalMapping['localType'],
        externalType: ExternalMapping['externalType'],
        externalId: string,
        entities: Map<number, T>,
    ): T | null {
        const mapping = this.findMappingInList(mappings, localType, externalType, externalId);
        if (!mapping) return null;
        return entities.get(Number(mapping.localId)) ?? null;
    }

    private uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
        const seen = new Set<string>();
        const result: T[] = [];

        for (const item of items) {
            const key = keyFn(item);
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(item);
        }

        return result;
    }

    private async timeOperation<T>(label: string, operation: () => Promise<T>): Promise<T> {
        const startedAt = Date.now();
        this.logger.log(`[timing] start ${label}`);
        try {
            const result = await operation();
            this.logger.log(`[timing] complete ${label} durationMs=${Date.now() - startedAt}`);
            return result;
        } catch (error) {
            this.logger.error(
                `[timing] failed ${label} durationMs=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    private timeSyncOperation<T>(label: string, operation: () => T): T {
        const startedAt = Date.now();
        const result = operation();
        this.logger.log(`[timing] complete ${label} durationMs=${Date.now() - startedAt}`);
        return result;
    }

    private normalizeName(value: string): string {
        return value.trim().toLowerCase();
    }

    private async assertCanEditTournament(tournamentId: number, user?: AuthUser): Promise<void> {
        if (!user?.id) {
            throw new ForbiddenException('Authentication required');
        }
        if (user.isAdmin) return;

        const canEdit = await this.participantService.canEdit(tournamentId, user.id);
        if (!canEdit) {
            throw new ForbiddenException(`Account ${user.id} cannot edit tournament ${tournamentId}`);
        }
    }
}
