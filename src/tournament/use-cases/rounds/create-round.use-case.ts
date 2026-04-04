import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round, Match, Song } from '@persistence/entities';
import { CreateRoundDto } from '../../dtos';

@Injectable()
export class CreateRoundUseCase {
    constructor(
        @InjectRepository(Round)
        private readonly roundsRepo: Repository<Round>,
        @InjectRepository(Match)
        private readonly matchRepo: Repository<Match>,
        @InjectRepository(Song)
        private readonly songRepo: Repository<Song>,
    ) {}

    async execute(dto: CreateRoundDto): Promise<Round> {
        const newRound = new Round();
        newRound.standings = [];
        newRound.matchAssignments = [];

        const match = await this.matchRepo.findOneBy({ id: dto.matchId });
        if (!match) throw new Error(`Match with id ${dto.matchId} not found. Insert round failed`);

        const song = await this.songRepo.findOneBy({ id: dto.songId });
        if (!song) throw new NotFoundException(`Song with id ${dto.songId} not found. Insert round failed`);

        newRound.match = match;
        newRound.song = song;

        await this.roundsRepo.save(newRound);
        return newRound;
    }
}
