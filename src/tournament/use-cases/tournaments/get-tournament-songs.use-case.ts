import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '@persistence/entities';

@Injectable()
export class GetTournamentSongsUseCase {
    constructor(
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
    ) {}

    async execute(tournamentId: number): Promise<Song[]> {
        return this.songRepository.find({ where: { tournament: { id: tournamentId } } });
    }
}
