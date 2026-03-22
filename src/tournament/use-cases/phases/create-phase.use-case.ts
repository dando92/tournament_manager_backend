import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Phase } from '@persistence/entities';
import { CreatePhaseDto } from '../../dtos';

@Injectable()
export class CreatePhaseUseCase {
    constructor(
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
    ) {}

    async execute(dto: CreatePhaseDto): Promise<Phase> {
        const division = await this.divisionRepository.findOneBy({ id: dto.divisionId });
        if (!division) throw new NotFoundException(`Division with ID ${dto.divisionId} not found`);
        const phase = new Phase();
        phase.name = dto.name;
        phase.division = division;
        return this.phaseRepository.save(phase);
    }
}
