import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phase } from '@persistence/entities';

@Injectable()
export class GetPhaseUseCase {
    constructor(
        @InjectRepository(Phase)
        private readonly phasesRepository: Repository<Phase>,
    ) {}

    async execute(id: number): Promise<Phase | null> {
        return this.phasesRepository.findOneBy({ id });
    }
}
