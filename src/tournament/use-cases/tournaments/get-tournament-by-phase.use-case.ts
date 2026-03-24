import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';

@Injectable()
export class GetTournamentByPhaseUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(phaseId: number): Promise<Tournament | null> {
        return this.tournamentsRepository.findOne({ where: { divisions: { phases: { id: phaseId } } } });
    }
}
