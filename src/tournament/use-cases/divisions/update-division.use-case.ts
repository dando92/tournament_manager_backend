import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Tournament } from '@persistence/entities';
import { UpdateDivisionDto } from '../../dtos';

@Injectable()
export class UpdateDivisionUseCase {
    constructor(
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        @InjectRepository(Tournament)
        private readonly tournamentRepository: Repository<Tournament>,
    ) {}

    async execute(id: number, dto: UpdateDivisionDto): Promise<Division> {
        const division = await this.divisionRepository.findOneBy({ id });
        if (!division) throw new NotFoundException(`Division with ID ${id} not found`);
        if (dto.tournamentId) {
            const tournament = await this.tournamentRepository.findOneBy({ id: dto.tournamentId });
            if (!tournament) throw new NotFoundException(`Tournament with ID ${dto.tournamentId} not found`);
            division.tournament = tournament;
            delete dto.tournamentId;
        }
        this.divisionRepository.merge(division, dto);
        return await this.divisionRepository.save(division);
    }
}
