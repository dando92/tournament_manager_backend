import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '@persistence/entities';

@Injectable()
export class GetScoresBySongUseCase {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
    ) {}

    async execute(songId: number): Promise<Score[]> {
        return this.scoreRepository.find({ where: { song: { id: songId } } });
    }
}
