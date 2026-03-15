import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Account } from '@persistence/entities';

@Injectable()
export class AssignTournamentHelperUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) {}

    async execute(tournamentId: number, accountId: string): Promise<Tournament> {
        const tournament = await this.tournamentsRepository.findOne({
            where: { id: tournamentId },
            relations: ['helpers'],
        });
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const account = await this.accountRepository.findOneBy({ id: accountId });
        if (!account) throw new NotFoundException(`Account ${accountId} not found`);

        tournament.helpers = [...(tournament.helpers ?? []), account];
        return this.tournamentsRepository.save(tournament);
    }
}
