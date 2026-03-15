import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Song } from '@persistence/entities';

@Injectable()
export class AddSongToTournamentUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
    ) {}

    async execute(tournamentId: number, songId: number): Promise<void> {
        const tournament = await this.tournamentsRepository.findOneBy({ id: tournamentId });
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const song = await this.songRepository.findOneBy({ id: songId });
        if (!song) throw new NotFoundException(`Song ${songId} not found`);

        song.tournament = tournament;
        await this.songRepository.save(song);
    }
}
