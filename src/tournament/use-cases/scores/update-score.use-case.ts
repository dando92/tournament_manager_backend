import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score, Song, Player } from '@persistence/entities';
import { UpdateScoreDto } from '../../dtos';

@Injectable()
export class UpdateScoreUseCase {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
        @InjectRepository(Player)
        private readonly playerRepository: Repository<Player>,
    ) {}

    async execute(id: number, dto: UpdateScoreDto): Promise<Score> {
        const existingScore = await this.scoreRepository.findOneBy({ id });
        if (!existingScore) throw new Error(`Score with ID ${id} not found`);

        if (dto.songId) {
            const song = await this.songRepository.findOneBy({ id: dto.songId });
            if (!song) throw new NotFoundException(`Song with ID ${dto.songId} not found`);
            dto.song = song;
            delete dto.songId;
        }

        if (dto.playerId) {
            const player = await this.playerRepository.findOneBy({ id: dto.playerId });
            if (!player) throw new NotFoundException(`Player with ID ${dto.playerId} not found`);
            dto.player = player;
            delete dto.playerId;
        }

        this.scoreRepository.merge(existingScore, dto);
        return await this.scoreRepository.save(existingScore);
    }
}
