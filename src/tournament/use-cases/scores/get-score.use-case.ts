import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '@persistence/entities';

@Injectable()
export class GetScoreUseCase {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
    ) {}

    async execute(id: number): Promise<Score | null> {
        return await this.scoreRepository.findOneBy({ id });
    }
}
