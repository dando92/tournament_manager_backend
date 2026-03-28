import { Injectable, Inject } from '@nestjs/common';
import { CreateRoundDto } from '@tournament/dtos';
import { UpdateMatchDto } from '@match/dtos/match.dto';
import { Match } from '@persistence/entities';
import { SongRoller } from '@tournament/services/song.roller';
import { MatchGateway } from '@match/gateways/match.gateway';
import { CreateRoundUseCase } from '@tournament/use-cases/rounds/create-round.use-case';
import { DeleteRoundUseCase } from '@tournament/use-cases/rounds/delete-round.use-case';
import { MatchService } from '@match/services/match.service';

@Injectable()
export class MatchManager {
    constructor(
        @Inject()
        private readonly matchService: MatchService,
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

    async GetMatch(id: number): Promise<Match | null> {
        return await this.matchService.getMatch(id);
    }

    async UpdateMatch(id: number, dto: UpdateMatchDto): Promise<Match> {
        return await this.matchService.update(id, dto);
    }

    async DeleteMatch(id: number): Promise<void> {
        return await this.matchService.delete(id);
    }

    async UpdateMatchPaths(matchId: number, dto: UpdateMatchDto): Promise<Match> {
        const match = await this.matchService.getMatch(Number(matchId));
        if (!match) throw new Error(`Match ${matchId} not found`);

        const newTargetPaths = dto.targetPaths ?? [];
        const oldTargets = new Set((match.targetPaths ?? []).filter(id => id > 0));
        const newTargets = new Set(newTargetPaths.filter(id => id > 0));

        // Remove this match from sourcePaths of destinations no longer targeted
        for (const oldDestId of oldTargets) {
            if (!newTargets.has(oldDestId)) {
                const destMatch = await this.matchService.getMatch(oldDestId);
                if (destMatch) {
                    const updateDto = new UpdateMatchDto();
                    updateDto.sourcePaths = (destMatch.sourcePaths ?? []).filter(id => id !== Number(matchId));
                    await this.matchService.update(oldDestId, updateDto);
                }
            }
        }

        // Add this match to sourcePaths of newly targeted destinations
        for (const newDestId of newTargets) {
            if (!oldTargets.has(newDestId)) {
                const destMatch = await this.matchService.getMatch(newDestId);
                if (destMatch) {
                    const existing = destMatch.sourcePaths ?? [];
                    if (!existing.includes(Number(matchId))) {
                        const updateDto = new UpdateMatchDto();
                        updateDto.sourcePaths = [...existing, Number(matchId)];
                        await this.matchService.update(newDestId, updateDto);
                    }
                }
            }
        }

        // Save this match's targetPaths
        const updateDto = new UpdateMatchDto();
        updateDto.targetPaths = newTargetPaths;
        await this.matchService.update(Number(matchId), updateDto);

        return await this.matchService.getMatch(Number(matchId));
    }

    async RemovePlayersFromMatch(matchId: number, playerIdsToRemove: number[]): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;
        const remainingPlayerIds = match.players
            .filter(player => !playerIdsToRemove.includes(player.id))
            .map(player => player.id);
        const dto = new UpdateMatchDto();
        dto.playerIds = remainingPlayerIds;
        await this.matchService.update(matchId, dto);
    }

    async AddPlayerInMatch(matchId: number, playerId: number): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;
        if (match.players.some(p => p.id === playerId)) return;
        const dto = new UpdateMatchDto();
        dto.playerIds = [...match.players.map(p => p.id), playerId];
        await this.matchService.update(matchId, dto);
    }

    async RemovePlayerInMatch(matchId: number, playerId: number): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;
        const dto = new UpdateMatchDto();
        dto.playerIds = match.players.filter(p => p.id !== playerId).map(p => p.id);
        await this.matchService.update(matchId, dto);
    }

    public async AddSongsToMatchById(matchId: number, songIds: number[]): Promise<void> {
        const match = await this.GetMatch(matchId);

        if (!match) {
            return;
        }

        await this.AddSongsToMatch(match, songIds);
    }

    public async AddRandomSongsToMatchById(matchId: number, tournamentId: number, divisionId: number, group: string, levels: string): Promise<void> {
        const match = await this.GetMatch(matchId);

        if (!match) {
            return;
        }

        await this.AddRandomSongsToMatch(match, tournamentId, divisionId, group, levels);
    }

    public async RemoveSongFromMatchById(matchId: number, songId: number): Promise<void> {
        const match = await this.GetMatch(matchId);

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

    public async AddRandomSongsToMatch(match: Match, tournamentId: number, divisionId: number, group: string, levels: string): Promise<Match> {
        const songIds = await this.songExtractor.RollSongs(tournamentId, divisionId, group, levels);

        return await this.AddSongsToMatch(match, songIds);
    }

    public async AddSongsToMatch(match: Match, songIds: number[]): Promise<Match> {
        if (!match.rounds) {
            match.rounds = [];
        }
        for (const songId of songIds) {
            await this.AddSongToMatch(match, songId);
        }

        await this.matchHub.OnMatchUpdate(match);
        return match;
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
