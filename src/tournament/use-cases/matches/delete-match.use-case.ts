import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '@persistence/entities';

@Injectable()
export class DeleteMatchUseCase {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
    ) {}

    async execute(id: number): Promise<void> {
        const match = await this.matchRepository.findOneBy({ id });
        if (!match) return;
        await this.matchRepository.remove(match);
    }
}
