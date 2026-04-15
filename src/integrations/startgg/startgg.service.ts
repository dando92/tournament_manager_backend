import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    Division,
    Entrant,
    ExternalMapping,
    Match,
    Participant,
    Phase,
    Player,
    Tournament,
} from '@persistence/entities';
import { DivisionService } from '@tournament/services/division.service';
import { EntrantService } from '@tournament/services/entrant.service';
import { MatchService } from '@match/services/match.service';
import { ParticipantService } from '@tournament/services/participant.service';
import { PhaseService } from '@tournament/services/phase.service';
import { PlayerService } from '@player/player.service';
import { TournamentService } from '@tournament/services/tournament.service';
import { CreateDivisionDto, CreateMatchDto, CreatePhaseDto } from '@tournament/dtos';
import { StartggClient } from './startgg.client';
import { StartggImportDto, StartggImportPreviewDto } from './startgg.dto';
import {
    StartggEntrantNode,
    StartggEventSnapshot,
    StartggParticipantNode,
    StartggPhaseNode,
    StartggSetNode,
} from './startgg.types';

type AuthUser = {
    id: string;
    isAdmin?: boolean;
};

@Injectable()
export class StartggService {
    constructor(
        private readonly startggClient: StartggClient,
        private readonly tournamentService: TournamentService,
        private readonly divisionService: DivisionService,
        private readonly phaseService: PhaseService,
        private readonly matchService: MatchService,
        private readonly participantService: ParticipantService,
        private readonly entrantService: EntrantService,
        private readonly playerService: PlayerService,
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
        @InjectRepository(ExternalMapping)
        private readonly externalMappingRepository: Repository<ExternalMapping>,
    ) {}

    async previewImport(dto: StartggImportPreviewDto, user?: AuthUser) {
        if (dto.targetTournamentId) {
            await this.assertCanEditTournament(dto.targetTournamentId, user);
        }

        const snapshot = await this.buildEventSnapshot(dto.eventSlug);
        const context = dto.targetTournamentId
            ? await this.buildLocalContext(dto.targetTournamentId)
            : null;

        const remotePhases = this.getEffectiveRemotePhases(snapshot);
        const seedByEntrantId = this.buildSeedMap(snapshot);
        const divisionMapping = context
            ? this.findMappingInList(context.mappings, 'division', 'event', snapshot.event.id)
            : null;
        const mappedDivision = divisionMapping
            ? context.divisionsById.get(Number(divisionMapping.localId)) ?? null
            : null;

        const participants = snapshot.entrants.flatMap((entrant) => entrant.participants);
        const uniqueParticipants = this.uniqueBy(participants, (participant) => participant.id);

        const participantPlan = uniqueParticipants.map((participant) => {
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
        });

        const entrantPlan = snapshot.entrants.map((entrant) => {
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
        });

        const phasePlan = remotePhases.map((phase) => {
            const mappedPhase = context
                ? this.findMappedLocalEntity(context.mappings, 'phase', 'phase', phase.id, context.phasesById)
                : null;
            return {
                externalId: phase.id,
                name: phase.name,
                action: mappedPhase ? 'mapped' : 'create-phase',
                localPhaseId: mappedPhase?.id ?? null,
            };
        });

        const defaultPhaseId = remotePhases[0]?.id ?? `event:${snapshot.event.id}:default-phase`;
        const matchPlan = snapshot.sets.map((set) => {
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
        });

        return {
            event: snapshot.event,
            targetTournamentId: dto.targetTournamentId ?? null,
            mode: dto.mode ?? 'create-division',
            division: {
                externalId: snapshot.event.id,
                name: snapshot.event.name,
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
    }

    async importEvent(dto: StartggImportDto, user?: AuthUser) {
        await this.assertCanEditTournament(dto.targetTournamentId, user);

        const snapshot = await this.buildEventSnapshot(dto.eventSlug);
        const tournament = await this.tournamentRepository.findOneBy({ id: dto.targetTournamentId });
        if (!tournament) throw new NotFoundException(`Tournament ${dto.targetTournamentId} not found`);

        const seedByEntrantId = this.buildSeedMap(snapshot);
        const remotePhases = this.getEffectiveRemotePhases(snapshot);

        const division = await this.ensureDivision(snapshot, tournament.id);
        if (snapshot.event.tournament?.id) {
            await this.upsertMapping({
                provider: 'startgg',
                localType: 'tournament',
                localId: String(tournament.id),
                externalType: 'tournament',
                externalId: snapshot.event.tournament.id,
                externalSlug: snapshot.event.tournament.slug ?? null,
                metadata: { eventSlug: snapshot.event.slug },
            });
        }

        const participantByExternalId = new Map<string, Participant>();
        for (const participant of this.uniqueBy(snapshot.entrants.flatMap((entrant) => entrant.participants), (node) => node.id)) {
            const localParticipant = await this.ensureParticipant(dto.targetTournamentId, participant);
            participantByExternalId.set(participant.id, localParticipant);
        }

        const entrantByExternalId = new Map<string, Entrant>();
        for (const entrant of snapshot.entrants) {
            const localEntrant = await this.ensureEntrant(division.id, entrant, participantByExternalId, seedByEntrantId.get(entrant.id) ?? null);
            entrantByExternalId.set(entrant.id, localEntrant);
        }

        const localPhases = new Map<string, Phase>();
        for (const phase of remotePhases) {
            const localPhase = await this.ensurePhase(division.id, phase);
            localPhases.set(phase.id, localPhase);
        }

        const fallbackPhase = remotePhases[0]
            ? localPhases.get(remotePhases[0].id)
            : await this.ensurePhase(division.id, {
                id: `event:${snapshot.event.id}:default-phase`,
                name: `${snapshot.event.name} Imported Phase`,
            });

        for (const set of snapshot.sets) {
            const targetPhase = (set.phaseId ? localPhases.get(set.phaseId) : null) ?? fallbackPhase;
            await this.ensureMatch(set, targetPhase.id, entrantByExternalId);
        }

        return {
            tournamentId: tournament.id,
            divisionId: division.id,
            imported: {
                participants: participantByExternalId.size,
                entrants: entrantByExternalId.size,
                phases: localPhases.size || (fallbackPhase ? 1 : 0),
                matches: snapshot.sets.length,
            },
        };
    }

    private async buildEventSnapshot(eventSlug: string): Promise<StartggEventSnapshot> {
        const event = await this.startggClient.getEventBySlug(eventSlug);
        const entrants = await this.startggClient.getEventEntrants(event.id);

        const seedLists = await Promise.all(
            (event.phases ?? []).map((phase) => this.startggClient.getPhaseSeeds(phase.id)),
        );
        const seeds = seedLists.flat();
        const sets = await this.startggClient.getEventSets(event.id);

        return {
            event,
            entrants,
            seeds,
            sets,
        };
    }

    private async buildLocalContext(tournamentId: number) {
        const [tournament, divisions, allPlayers, mappings] = await Promise.all([
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
        ]);

        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const participantsById = new Map<number, Participant>((tournament.participants ?? []).map((participant) => [participant.id, participant]));
        const entrants = divisions.flatMap((division) => division.entrants ?? []);
        const phases = divisions.flatMap((division) => division.phases ?? []);
        const matches = await this.matchRepository.find({
            where: { phase: { division: { tournament: { id: tournamentId } } } },
        });

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

    private async ensureDivision(snapshot: StartggEventSnapshot, tournamentId: number): Promise<Division> {
        const existingMapping = await this.externalMappingRepository.findOne({
            where: {
                provider: 'startgg',
                localType: 'division',
                externalType: 'event',
                externalId: snapshot.event.id,
            },
        });

        let division = existingMapping
            ? await this.divisionRepository.findOne({
                where: { id: Number(existingMapping.localId) },
                relations: { tournament: true, entrants: true, phases: true },
            })
            : null;

        if (!division) {
            const dto = new CreateDivisionDto();
            dto.name = snapshot.event.name;
            dto.tournamentId = tournamentId;
            division = await this.divisionService.create(dto);
        }

        await this.upsertMapping({
            provider: 'startgg',
            localType: 'division',
            localId: String(division.id),
            externalType: 'event',
            externalId: snapshot.event.id,
            externalSlug: snapshot.event.slug,
            metadata: {
                tournamentId,
                startggTournamentId: snapshot.event.tournament?.id ?? null,
            },
        });

        return division;
    }

    private async ensureParticipant(tournamentId: number, participant: StartggParticipantNode): Promise<Participant> {
        const existingMapping = await this.externalMappingRepository.findOne({
            where: {
                provider: 'startgg',
                localType: 'participant',
                externalType: 'participant',
                externalId: participant.id,
            },
        });

        let localParticipant = existingMapping
            ? await this.participantRepository.findOne({
                where: { id: Number(existingMapping.localId), tournament: { id: tournamentId } },
                relations: { player: true, tournament: true, account: true },
            })
            : null;

        if (!localParticipant) {
            const normalizedName = this.normalizeName(participant.gamerTag);
            const existingPlayer = (await this.playerService.findAll())
                .find((candidate) => this.normalizeName(candidate.playerName) === normalizedName) ?? null;
            const player = existingPlayer ?? await this.playerService.create(participant.gamerTag);
            localParticipant = await this.participantService.ensureForPlayer(tournamentId, player.id, ['competitor']);
        }

        await this.upsertMapping({
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
    ): Promise<Entrant> {
        const existingMapping = await this.externalMappingRepository.findOne({
            where: {
                provider: 'startgg',
                localType: 'entrant',
                externalType: 'entrant',
                externalId: entrant.id,
            },
        });

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

        await this.upsertMapping({
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

    private async ensurePhase(divisionId: number, phase: StartggPhaseNode): Promise<Phase> {
        const existingMapping = await this.externalMappingRepository.findOne({
            where: {
                provider: 'startgg',
                localType: 'phase',
                externalType: 'phase',
                externalId: phase.id,
            },
        });

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

        await this.upsertMapping({
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

    private async ensureMatch(
        set: StartggSetNode,
        localPhaseId: number,
        entrantByExternalId: Map<string, Entrant>,
    ): Promise<Match> {
        const existingMapping = await this.externalMappingRepository.findOne({
            where: {
                provider: 'startgg',
                localType: 'match',
                externalType: 'set',
                externalId: set.id,
            },
        });

        const entrantIds = set.entrants
            .map((entrant) => entrantByExternalId.get(entrant.id)?.id)
            .filter((id): id is number => Boolean(id));

        let localMatch = existingMapping
            ? await this.matchRepository.findOne({
                where: { id: Number(existingMapping.localId) },
                relations: { entrants: { participants: { player: true } } },
            })
            : null;

        if (!localMatch) {
            const dto = new CreateMatchDto();
            dto.name = this.buildMatchName(set);
            dto.subtitle = set.phaseGroupName ?? undefined;
            dto.notes = `Imported from start.gg set ${set.id}`;
            dto.phaseId = localPhaseId;
            dto.entrantIds = entrantIds;
            dto.scoringSystem = 'EurocupScoreCalculator';
            localMatch = await this.matchService.create(dto);
        } else {
            localMatch.name = this.buildMatchName(set);
            localMatch.subtitle = set.phaseGroupName ?? localMatch.subtitle;
            localMatch.notes = `Imported from start.gg set ${set.id}`;
            localMatch.entrants = await this.entrantRepository.find({
                where: entrantIds.map((id) => ({ id })),
                relations: { participants: { player: true } },
            });
            localMatch = await this.matchRepository.save(localMatch);
        }

        await this.upsertMapping({
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

        return localMatch;
    }

    private buildSeedMap(snapshot: StartggEventSnapshot): Map<string, number> {
        const seedByEntrantId = new Map<string, number>();
        for (const seed of snapshot.seeds) {
            const entrantId = seed.entrant?.id;
            if (!entrantId) continue;
            const existing = seedByEntrantId.get(entrantId);
            if (existing === undefined || seed.seedNum < existing) {
                seedByEntrantId.set(entrantId, seed.seedNum);
            }
        }
        return seedByEntrantId;
    }

    private getEffectiveRemotePhases(snapshot: StartggEventSnapshot): StartggPhaseNode[] {
        const phases = [...(snapshot.event.phases ?? [])];
        const knownIds = new Set(phases.map((phase) => phase.id));

        for (const set of snapshot.sets) {
            if (set.phaseId && !knownIds.has(set.phaseId)) {
                phases.push({
                    id: set.phaseId,
                    name: set.phaseName ?? `Phase ${set.phaseId}`,
                });
                knownIds.add(set.phaseId);
            }
        }

        if (phases.length === 0) {
            phases.push({
                id: `event:${snapshot.event.id}:default-phase`,
                name: `${snapshot.event.name} Imported Phase`,
            });
        }

        return phases;
    }

    private buildMatchName(set: StartggSetNode): string {
        return set.fullRoundText?.trim() || `start.gg Set ${set.id}`;
    }

    private async upsertMapping(partial: Partial<ExternalMapping>): Promise<ExternalMapping> {
        let mapping = await this.externalMappingRepository.findOne({
            where: {
                provider: partial.provider,
                localType: partial.localType,
                localId: partial.localId,
                externalType: partial.externalType,
                externalId: partial.externalId,
            },
        });

        if (!mapping) {
            mapping = this.externalMappingRepository.create({
                provider: partial.provider,
                localType: partial.localType,
                localId: partial.localId,
                externalType: partial.externalType,
                externalId: partial.externalId,
                externalSlug: partial.externalSlug ?? null,
                metadata: partial.metadata ?? null,
            });
        } else {
            mapping.externalSlug = partial.externalSlug ?? mapping.externalSlug;
            mapping.metadata = {
                ...(mapping.metadata ?? {}),
                ...(partial.metadata ?? {}),
            };
        }

        return this.externalMappingRepository.save(mapping);
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
