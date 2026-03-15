import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round, Match, Song } from '@persistence/entities';
import { UpdateRoundDto } from '../../dtos';

@Injectable()
export class UpdateRoundUseCase {
    constructor(
        @InjectRepository(Round)
        private readonly roundsRepo: Repository<Round>,
        @InjectRepository(Match)
        private readonly matchRepo: Repository<Match>,
        @InjectRepository(Song)
        private readonly songRepo: Repository<Song>,
    ) {}

    async execute(id: number, dto: UpdateRoundDto): Promise<Round> {
        const round = await this.roundsRepo.findOneBy({ id });
        if (!round) throw new NotFoundException(`Round with id ${id} not found. Update round failed`);

        if (dto.matchId) {
            const match = await this.matchRepo.findOneBy({ id: dto.matchId });
            if (!match) throw new NotFoundException(`Match with id ${dto.matchId} not found. Update round failed`);
            dto.match = match;
            delete dto.matchId;
        }

        if (dto.songId) {
            const song = await this.songRepo.findOneBy({ id: dto.songId });
            if (!song) throw new NotFoundException(`Song with id ${dto.songId} not found. Update round failed`);
            dto.song = song;
            delete dto.songId;
        }

        this.roundsRepo.merge(round, dto);
        return await this.roundsRepo.save(round);
    }
}
