import { Injectable, Inject } from '@nestjs/common';
import { Division, Song } from '@persistence/entities';
import { GetDivisionUseCase } from '../use-cases/divisions/get-division.use-case';
import { GetTournamentUseCase } from '../use-cases/tournaments/get-tournament.use-case';

@Injectable()
export class SongRoller {
    constructor(
        @Inject()
        private readonly getDivisionUseCase: GetDivisionUseCase,
        @Inject()
        private readonly getTournamentUseCase: GetTournamentUseCase) { }

    async RollSongs(tournamentId: number, divisionId: number, group: string, levels: string): Promise<number[]> {
        const songs: number[] = [];
        const intLevels = levels.split(",").map(s => parseInt(s, 10));

        for (const level of intLevels) {
            const songId = await this.RollASong(tournamentId, divisionId, group, level);

            if (songId != 0) {
                songs.push(songId);
            }
        }

        return songs;
    }

    async RollASong(tournamentId: number, divisionId: number, group: string, level: number): Promise<number> {
        const division = await this.getDivisionUseCase.execute(divisionId);

        if (!division) {
            return 0;
        }

        const tournament = await this.getTournamentUseCase.execute(tournamentId);

        if (!tournament) {
            return 0;
        }

        const songs = await tournament.songs;

        return this.RollSong(songs, division, group, level);
    }

    private RollSong(songs: Song[], division: Division, group: string | null, level: number): number {
        const availableSongs = this.GetAvailableSong(songs, division, level, group);

        if (availableSongs.length == 0)
            return 0;

        return this.GetRandomElement(availableSongs);
    }

    private GetAvailableSong(songs: Song[], division: Division, level: number, group: string | null): number[] {
        const allSongs: number[] = songs.filter(s => (group === null || (group !== null && s.group === group)) && s.difficulty === level).map(s => s.id);
        const bannedSongs: number[] = this.GetBannedSongs(division);

        return allSongs.filter(songId => !bannedSongs.includes(songId));
    }

    private GetBannedSongs(division: Division): number[] {
        return division.phases.flatMap(p => p.matches ?? []).flatMap(
            match => match.rounds.flatMap(round => round.song.id || []));
    }

    private GetRandomElement<T>(array: T[]): T {
        const randomIndex = Math.floor(Math.random() * array.length);
        return array[randomIndex];
    }
}
