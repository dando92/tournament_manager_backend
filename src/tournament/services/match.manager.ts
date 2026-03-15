import { Injectable, Inject } from '@nestjs/common';
import { CreateRoundDto } from '../../tournament/dtos';
import { Match } from '@persistence/entities';
import { SongRoller } from './song.roller';
import { MatchGateway } from '../gateways/match.gateway';
import { GetMatchUseCase } from '../use-cases/matches/get-match.use-case';
import { CreateRoundUseCase } from '../use-cases/rounds/create-round.use-case';
import { DeleteRoundUseCase } from '../use-cases/rounds/delete-round.use-case';

@Injectable()
export class MatchManager {
    activeMatchId: number;
    activeMatch: Match;

    constructor(
        @Inject()
        private readonly getMatchUseCase: GetMatchUseCase,
        @Inject()
        private readonly createRoundUseCase: CreateRoundUseCase,
        @Inject()
        private readonly deleteRoundUseCase: DeleteRoundUseCase,
        @Inject()
        private readonly songExtractor: SongRoller,
        @Inject()
        private readonly matchHub: MatchGateway
    ) {
    }

    public async AddSongsToMatchById(matchId: number, songIds: number[]): Promise<void> {
        const match = await this.getMatchUseCase.execute(matchId);

        if (!match) {
            return;
        }

        await this.AddSongsToMatch(match, songIds);
    }

    public async AddRandomSongsToMatchById(matchId: number, tournamentId: number, divisionId: number, group: string, levels: string): Promise<void> {
        const match = await this.getMatchUseCase.execute(matchId);

        if (!match) {
            return;
        }

        await this.AddRandomSongsToMatch(match, tournamentId, divisionId, group, levels);
    }

    public async RemoveSongFromMatchById(matchId: number, songId: number): Promise<void> {
        const match = await this.getMatchUseCase.execute(matchId);

        if (!match) {
            return;
        }

        await this.RemoveSongFromMatch(match, songId);
    }

    private async RemoveSongFromMatch(match: Match, songId: number): Promise<void> {
        const round = match.rounds.find(round => round.song.id == songId);

        if (!round) {
            return;
        }

        //TODO: how to request "are you sure???" when standings are filled
        if (round.standings.length > 0) {
            return;
        }

        await this.deleteRoundUseCase.execute(round.id);
        match.rounds = match.rounds.filter(round => round.id == round.id);
        await this.matchHub.OnMatchUpdate(match);
    }

    public async AddRandomSongsToMatch(match: Match, tournamentId: number, divisionId: number, group: string, levels: string): Promise<void> {
        const songIds = await this.songExtractor.RollSongs(tournamentId, divisionId, group, levels);

        await this.AddSongsToMatch(match, songIds);
    }

    public async AddSongsToMatch(match: Match, songIds: number[]): Promise<void> {
        if (!match.rounds) {
            match.rounds = [];
        }
        for (const songId of songIds) {
            await this.AddSongToMatch(match, songId);
        }

        await this.matchHub.OnMatchUpdate(match);
    }

    private async AddSongToMatch(match: Match, songId: number): Promise<void> {
        const round = await this.createRoundUseCase.execute(this.GetRoundDto(match, songId));

        delete round.match;

        match.rounds.push(round);
    }

    private GetRoundDto(match: Match, songId: number): CreateRoundDto {
        const dto = new CreateRoundDto();
        dto.matchId = match.id;
        dto.songId = songId;
        return dto;
    }
}
