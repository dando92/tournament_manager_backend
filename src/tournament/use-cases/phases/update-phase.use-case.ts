import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phase, Division } from '@persistence/entities';
import { UpdatePhaseDto } from '../../dtos';

@Injectable()
export class UpdatePhaseUseCase {
    constructor(
        @InjectRepository(Phase)
        private readonly phasesRepository: Repository<Phase>,
        @InjectRepository(Division)
        private readonly divisionRepo: Repository<Division>,
    ) {}

    async execute(id: number, dto: UpdatePhaseDto): Promise<Phase> {
        const phase = await this.phasesRepository.findOneBy({ id });
        if (!phase) throw new NotFoundException(`Phase with id ${id} not found. Update phase failed`);

        if (dto.divisionId) {
            const division = await this.divisionRepo.findOneBy({ id: dto.divisionId });
            if (!division) throw new NotFoundException(`Division with id ${dto.divisionId} not found. Update phase failed.`);
            dto.division = Promise.resolve(division);
            delete dto.divisionId;
        }

        this.phasesRepository.merge(phase, dto);
        return await this.phasesRepository.save(phase);
    }
}
