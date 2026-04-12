import { Injectable, NotFoundException } from '@nestjs/common';
import { Tournament } from '@persistence/entities';
import { CreateTournamentDto, TournamentOverviewDto, TournamentResponseDto, UpdateTournamentDto } from '../dtos';
import { DivisionService } from './division.service';
import { TournamentService } from './tournament.service';
import { UserService } from '../../user/services/user.service';
import { ParticipantService } from './participant.service';

@Injectable()
export class TournamentManager {
    constructor(
        private readonly divisionService: DivisionService,
        private readonly tournamentService: TournamentService,
        private readonly userService: UserService,
        private readonly participantService: ParticipantService,
    ) {}

    private toResponseDto(tournament: Tournament): TournamentResponseDto {
        return {
            id: tournament.id,
            name: tournament.name,
            syncstartUrl: tournament.syncstartUrl,
            staff: (tournament.participants ?? [])
                .filter((participant) => participant.roles?.includes('staff') && participant.account)
                .map((participant) => ({
                    id: participant.account.id,
                    username: participant.account.username,
                })),
        };
    }

    async create(dto: CreateTournamentDto, ownerId?: string): Promise<TournamentResponseDto> {
        const tournament = await this.tournamentService.create(dto, ownerId);
        if (ownerId) {
            await this.participantService.ensureStaff(tournament.id, ownerId);
        }
        const reloaded = await this.tournamentService.findOne(tournament.id);
        return this.toResponseDto(reloaded ?? tournament);
    }

    async findOne(tournamentId: number): Promise<TournamentResponseDto | null> {
        const tournament = await this.tournamentService.findOne(tournamentId);
        return tournament ? this.toResponseDto(tournament) : null;
    }

    async update(tournamentId: number, dto: UpdateTournamentDto): Promise<{ tournament: TournamentResponseDto; previousSyncstartUrl: string | undefined }> {
        const result = await this.tournamentService.update(tournamentId, dto);
        return {
            tournament: this.toResponseDto(result.tournament),
            previousSyncstartUrl: result.previousSyncstartUrl,
        };
    }

    async addHelper(tournamentId: number, accountId: string): Promise<TournamentResponseDto> {
        const tournament = await this.tournamentService.findOne(tournamentId);
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const account = await this.userService.findById(accountId);
        if (!account) throw new NotFoundException(`Account ${accountId} not found`);

        await this.participantService.ensureStaff(tournamentId, accountId);
        const updated = await this.tournamentService.findOne(tournamentId);
        return this.toResponseDto(updated);
    }

    async removeHelper(tournamentId: number, accountId: string): Promise<TournamentResponseDto> {
        const tournament = await this.tournamentService.findOne(tournamentId);
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        await this.participantService.removeStaff(tournamentId, accountId);
        const updated = await this.tournamentService.findOne(tournamentId);
        return this.toResponseDto(updated);
    }

    async findOverview(tournamentId: number): Promise<TournamentOverviewDto> {
        const divisions = await this.divisionService.findOverviewData(tournamentId);
        const divisionCount = divisions.length;
        const playerCount = divisions.reduce(
            (count, division) => count + (division.entrants?.filter((entrant) => entrant.status === 'active').length ?? 0),
            0,
        );
        const matchCount = divisions.reduce(
            (count, division) =>
                count + (division.phases ?? []).reduce((phaseCount, phase) => phaseCount + (phase.matches?.length ?? 0), 0),
            0,
        );

        return {
            divisionCount,
            playerCount,
            matchCount,
            divisions: divisions.map((division) => ({
                id: division.id,
                name: division.name,
                entrants: (division.entrants ?? []).map((entrant) => ({
                    id: entrant.id,
                    name: entrant.name,
                    type: entrant.type,
                    seedNum: entrant.seedNum ?? null,
                    status: entrant.status,
                    participants: (entrant.participants ?? []).map((participant) => ({
                        id: participant.id,
                        roles: participant.roles ?? [],
                        status: participant.status,
                        player: {
                            id: participant.player.id,
                            playerName: participant.player.playerName,
                        },
                    })),
                })),
                phases: (division.phases ?? []).map((phase) => ({
                    id: phase.id,
                    name: phase.name,
                    matchCount: phase.matches?.length ?? 0,
                })),
            })),
        };
    }
}
