import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division } from '@persistence/entities';

@Injectable()
export class GetDivisionUseCase {
    constructor(
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
    ) {}

    async execute(id: number): Promise<Division | null> {
        return await this.divisionRepository.findOne({ where: { id }, relations: ['tournament'] });
    }
}
