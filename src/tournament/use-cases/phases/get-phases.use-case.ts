import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phase } from '@persistence/entities';

@Injectable()
export class GetPhasesUseCase {
    constructor(
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
    ) {}

    async execute(divisionId?: number): Promise<Phase[]> {
        if (divisionId) {
            return this.phaseRepository.find({ where: { division: { id: divisionId } } });
        }
        return this.phaseRepository.find();
    }
}
