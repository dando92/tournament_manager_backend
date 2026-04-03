import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Account } from '@persistence/entities';
import { TournamentService } from './tournament.service';

@Injectable()
export class TournamentManager {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
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

    async addSong(tournamentId: number, songId: number): Promise<void> {
        const tournament = await this.tournamentService.findOne(tournamentId);
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        await this.tournamentService.update(tournamentId, { songToAdd: songId });
    }

    async removeSong(tournamentId: number, songId: number): Promise<void> {
        const tournament = await this.tournamentService.findOne(tournamentId);
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        await this.tournamentService.update(tournamentId, { songToRemove: songId });
    }
}
