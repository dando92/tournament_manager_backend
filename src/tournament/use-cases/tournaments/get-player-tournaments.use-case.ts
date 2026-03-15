import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Account } from '@persistence/entities';

@Injectable()
export class GetPlayerTournamentsUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) {}

    async execute(accountId: string): Promise<number[]> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            relations: ['player'],
        });
        if (!account?.player) return [];

        const tournaments = await this.tournamentsRepository
            .createQueryBuilder('tournament')
            .leftJoin('tournament.players', 'player')
            .where('player.id = :playerId', { playerId: account.player.id })
            .select(['tournament.id'])
            .getMany();

        return tournaments.map(t => t.id);
    }
}
