import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';

@Injectable()
export class IsHelperOfAnyUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(accountId: string): Promise<boolean> {
        const count = await this.tournamentsRepository
            .createQueryBuilder('tournament')
            .leftJoin('tournament.helpers', 'helper')
            .where('helper.id = :accountId', { accountId })
            .getCount();
        return count > 0;
    }
}
