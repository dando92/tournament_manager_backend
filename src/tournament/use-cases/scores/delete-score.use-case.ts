import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '@persistence/entities';

@Injectable()
export class DeleteScoreUseCase {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
    ) {}

    async execute(id: number): Promise<void> {
        await this.scoreRepository.delete(id);
    }
}
