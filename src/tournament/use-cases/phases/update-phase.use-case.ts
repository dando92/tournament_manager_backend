import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phase } from '@persistence/entities';
import { UpdatePhaseDto } from '../../dtos';

@Injectable()
export class UpdatePhaseUseCase {
    constructor(
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
    ) {}

    async execute(id: number, dto: UpdatePhaseDto): Promise<Phase> {
        const phase = await this.phaseRepository.findOneBy({ id });
        if (!phase) throw new NotFoundException(`Phase with ID ${id} not found`);
        if (dto.name !== undefined) phase.name = dto.name;
        return this.phaseRepository.save(phase);
    }
}
