import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song, Tournament } from '@persistence/entities';
import { CreateSongDto } from '../../dtos';

@Injectable()
export class CreateSongUseCase {
    constructor(
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
        @InjectRepository(Tournament)
        private readonly tournamentRepository: Repository<Tournament>,
    ) {}

    async execute(dto: CreateSongDto): Promise<Song> {
        const song = this.songRepository.create(dto);
        song.title = dto.title;
        song.group = dto.group;
        song.difficulty = dto.difficulty;

        if (dto.tournamentId) {
            const tournament = await this.tournamentRepository.findOneBy({ id: dto.tournamentId });
            if (tournament) song.tournament = tournament;
        }

        return await this.songRepository.save(song);
    }
}
