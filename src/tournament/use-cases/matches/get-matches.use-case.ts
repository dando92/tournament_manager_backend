import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '@persistence/entities';

@Injectable()
export class GetMatchesUseCase {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
    ) {}

    async execute(): Promise<Match[]> {
        return await this.matchRepository.find();
    }
}
