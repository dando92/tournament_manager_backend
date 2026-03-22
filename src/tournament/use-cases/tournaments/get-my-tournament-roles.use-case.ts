import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';

export interface MyTournamentRoles {
    ownedTournamentIds: number[];
    helperTournamentIds: number[];
}

@Injectable()
export class GetMyTournamentRolesUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(accountId: string): Promise<MyTournamentRoles> {
        const owned = await this.tournamentsRepository.find({
            where: { owner: { id: accountId } },
            select: ['id'],
        });

        const helped = await this.tournamentsRepository
            .createQueryBuilder('tournament')
            .leftJoin('tournament.helpers', 'helper')
            .where('helper.id = :accountId', { accountId })
            .select('tournament.id')
            .getMany();

        return {
            ownedTournamentIds: owned.map((t) => t.id),
            helperTournamentIds: helped.map((t) => t.id),
        };
    }
}
