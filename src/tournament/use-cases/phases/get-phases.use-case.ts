import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phase } from '@persistence/entities';

@Injectable()
export class GetPhasesUseCase {
    constructor(
        @InjectRepository(Phase)
        private readonly phasesRepository: Repository<Phase>,
    ) {}

    async execute(): Promise<Phase[]> {
        return this.phasesRepository.find();
    }
}
