import { Injectable, NotFoundException } from '@nestjs/common';
import { Tournament } from '@persistence/entities';
import { CreateTournamentDto, TournamentOverviewDto, TournamentResponseDto, UpdateTournamentDto } from '../dtos';
import { DivisionService } from './division.service';
import { TournamentService } from './tournament.service';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class TournamentManager {
    constructor(
        private readonly divisionService: DivisionService,
        private readonly tournamentService: TournamentService,
        private readonly userService: UserService,
    ) {}

    private toResponseDto(tournament: Tournament): TournamentResponseDto {
        return {
            id: tournament.id,
            name: tournament.name,
            syncstartUrl: tournament.syncstartUrl,
            helpers: (tournament.helpers ?? []).map((helper) => ({
                id: helper.id,
                username: helper.username,
            })),
        };
    }

    async create(dto: CreateTournamentDto, ownerId?: string): Promise<TournamentResponseDto> {
        const tournament = await this.tournamentService.create(dto, ownerId);
        return this.toResponseDto(tournament);
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

        const helpers = [...(tournament.helpers ?? []), account];
        const updated = await this.tournamentService.update(tournamentId, { helpers });
        return this.toResponseDto(updated.tournament);
    }

    async removeHelper(tournamentId: number, accountId: string): Promise<TournamentResponseDto> {
        const tournament = await this.tournamentService.findOne(tournamentId);
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const helpers = (tournament.helpers ?? []).filter(h => h.id !== accountId);
        const updated = await this.tournamentService.update(tournamentId, { helpers });
        return this.toResponseDto(updated.tournament);
    }

    async findOverview(tournamentId: number): Promise<TournamentOverviewDto> {
        const divisions = await this.divisionService.findOverviewData(tournamentId);
        const divisionCount = divisions.length;
        const playerCount = divisions.reduce((count, division) => count + (division.players?.length ?? 0), 0);
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
                players: (division.players ?? []).map((player) => ({
                    id: player.id,
                    playerName: player.playerName,
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
