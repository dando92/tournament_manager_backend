import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phase, Division } from '@persistence/entities';
import { CreatePhaseDto } from '../../dtos';

@Injectable()
export class CreatePhaseUseCase {
    constructor(
        @InjectRepository(Phase)
        private readonly phasesRepository: Repository<Phase>,
        @InjectRepository(Division)
        private readonly divisionRepo: Repository<Division>,
    ) {}

    async execute(dto: CreatePhaseDto): Promise<Phase> {
        const phase = new Phase();
        phase.name = dto.name;

        const division = await this.divisionRepo.findOneBy({ id: dto.divisionId });
        if (!division) throw new NotFoundException(`division with ID ${dto.divisionId} not found`);

        phase.division = Promise.resolve(division);
        await this.phasesRepository.save(phase);
        return phase;
    }
}
