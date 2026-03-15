import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '@persistence/entities';

@Injectable()
export class RemovePlayersFromMatchUseCase {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
    ) {}

    async execute(matchId: number, playerIdsToRemove: number[]): Promise<void> {
        const match = await this.matchRepository.findOneBy({ id: matchId });
        if (!match) return;
        match.players = match.players.filter(player => !playerIdsToRemove.includes(player.id));
        await this.matchRepository.save(match);
    }
}
