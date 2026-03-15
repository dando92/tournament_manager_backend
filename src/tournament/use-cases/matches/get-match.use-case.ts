import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '@persistence/entities';

@Injectable()
export class GetMatchUseCase {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
    ) {}

    async execute(id: number): Promise<Match | null> {
        return await this.matchRepository.findOneBy({ id });
    }
}
