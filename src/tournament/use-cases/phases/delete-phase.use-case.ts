import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phase } from '@persistence/entities';

@Injectable()
export class DeletePhaseUseCase {
    constructor(
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
    ) {}

    async execute(id: number): Promise<void> {
        await this.phaseRepository.delete(id);
    }
}
