import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '@persistence/entities';

@Injectable()
export class RemoveSongFromTournamentUseCase {
    constructor(
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
    ) {}

    async execute(tournamentId: number, songId: number): Promise<void> {
        const song = await this.songRepository.findOne({
            where: { id: songId, tournament: { id: tournamentId } },
        });
        if (!song) return;

        song.tournament = null;
        await this.songRepository.save(song);
    }
}
