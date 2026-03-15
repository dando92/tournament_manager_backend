import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';

@Injectable()
export class GetTournamentsUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(userId?: string, isAdmin?: boolean, isTournamentCreator?: boolean): Promise<Tournament[]> {
        if (!userId || isAdmin) {
            return this.tournamentsRepository.find();
        }
        return this.tournamentsRepository
            .createQueryBuilder('tournament')
            .leftJoin('tournament.owner', 'owner')
            .leftJoin('tournament.helpers', 'helper')
            .where('owner.id = :userId OR helper.id = :userId', { userId })
            .getMany();
    }
}
