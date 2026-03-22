import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Tournament } from '@persistence/entities';
import { CreateDivisionDto } from '../../dtos';

@Injectable()
export class CreateDivisionUseCase {
    constructor(
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        @InjectRepository(Tournament)
        private readonly tournamentRepository: Repository<Tournament>,
    ) {}

    async execute(dto: CreateDivisionDto): Promise<Division> {
        const tournament = await this.tournamentRepository.findOneBy({ id: dto.tournamentId });
        if (!tournament) throw new NotFoundException(`Tournament with ID ${dto.tournamentId} not found`);
        const division = new Division();
        division.name = dto.name;
        division.tournament = tournament;
        await this.divisionRepository.save(division);
        return division;
    }
}
