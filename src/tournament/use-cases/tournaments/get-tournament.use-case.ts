import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';

@Injectable()
export class GetTournamentUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(id: number): Promise<Tournament | null> {
        return this.tournamentsRepository.findOne({ where: { id }, relations: ['helpers', 'owner'] });
    }
}
