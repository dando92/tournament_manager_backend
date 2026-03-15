import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score, Song, Player } from '@persistence/entities';
import { CreateScoreDto } from '../../dtos';

@Injectable()
export class CreateScoreUseCase {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
        @InjectRepository(Player)
        private readonly playerRepository: Repository<Player>,
    ) {}

    async execute(dto: CreateScoreDto): Promise<Score> {
        const song = await this.songRepository.findOneBy({ id: dto.songId });
        if (!song) throw new NotFoundException(`Song with ID ${dto.songId} not found`);

        const player = await this.playerRepository.findOneBy({ id: dto.playerId });
        if (!player) throw new NotFoundException(`Player with ID ${dto.playerId} not found`);

        const newScore = new Score();
        newScore.percentage = dto.percentage;
        newScore.isFailed = dto.isFailed;
        newScore.song = song;
        newScore.player = player;

        await this.scoreRepository.save(newScore);
        return newScore;
    }
}
