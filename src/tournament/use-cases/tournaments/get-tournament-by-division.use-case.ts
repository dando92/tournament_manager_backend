import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';

@Injectable()
export class GetTournamentByDivisionUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(divisionId: number): Promise<Tournament | null> {
        return this.tournamentsRepository.findOne({ where: { divisions: { id: divisionId } } });
    }
}
