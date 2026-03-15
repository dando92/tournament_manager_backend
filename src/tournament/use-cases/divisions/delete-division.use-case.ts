import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division } from '@persistence/entities';

@Injectable()
export class DeleteDivisionUseCase {
    constructor(
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
    ) {}

    async execute(id: number): Promise<void> {
        await this.divisionRepository.delete(id);
    }
}
