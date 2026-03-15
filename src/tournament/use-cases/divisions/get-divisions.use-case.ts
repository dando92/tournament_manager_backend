import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division } from '@persistence/entities';

@Injectable()
export class GetDivisionsUseCase {
    constructor(
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
    ) {}

    async execute(tournamentId?: number): Promise<Division[]> {
        if (tournamentId) {
            return this.divisionRepository.find({ where: { tournament: { id: tournamentId } }, relations: ['tournament'] });
        }
        return await this.divisionRepository.find();
    }
}
