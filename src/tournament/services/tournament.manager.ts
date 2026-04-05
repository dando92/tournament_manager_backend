import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Account } from '@persistence/entities';
import { TournamentOverviewDto } from '../dtos';
import { DivisionService } from './division.service';
import { TournamentService } from './tournament.service';

@Injectable()
export class TournamentManager {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        private readonly divisionService: DivisionService,
        private readonly tournamentService: TournamentService,
    ) {}

    async addHelper(tournamentId: number, accountId: string): Promise<Tournament> {
        const tournament = await this.tournamentService.findOne(tournamentId);
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const account = await this.accountRepository.findOneBy({ id: accountId });
        if (!account) throw new NotFoundException(`Account ${accountId} not found`);

        const helpers = [...(tournament.helpers ?? []), account];
        return (await this.tournamentService.update(tournamentId, { helpers })).tournament;
    }

    async removeHelper(tournamentId: number, accountId: string): Promise<Tournament> {
        const tournament = await this.tournamentService.findOne(tournamentId);
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const helpers = (tournament.helpers ?? []).filter(h => h.id !== accountId);
        return (await this.tournamentService.update(tournamentId, { helpers })).tournament;
    }

    async findOverview(tournamentId: number): Promise<TournamentOverviewDto> {
        const divisions = await this.divisionService.findOverviewData(tournamentId);

        const divisionCount = divisions.length;
        const playerCount = divisions.reduce((count, division) => count + (division.players?.length ?? 0), 0);
        const matchCount = divisions.reduce(
            (count, division) =>
                count + (division.phases ?? []).reduce((sum, phase) => sum + (phase.matches?.length ?? 0), 0),
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
                    matches: (phase.matches ?? []).map((match) => ({ id: match.id })),
                })),
            })),
        };
    }

}
