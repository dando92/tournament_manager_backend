import { Injectable, Inject } from '@nestjs/common';
import { CreateRoundDto } from '@tournament/dtos';
import { UpdateMatchDto } from '@match/dtos/match.dto';
import { Match } from '@persistence/entities';
import { SongRoller } from '@tournament/services/song.roller';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';
import { MatchService } from '@match/services/match.service';
import { RoundService } from '@tournament/services/round.service';
import { StandingService } from '@tournament/standing/standing.service';
import { MatchListDto } from '@match/dtos/match-list.dto';

@Injectable()
export class MatchManager {
    constructor(
        @Inject()
        private readonly matchService: MatchService,
        @Inject()
        private readonly songExtractor: SongRoller,
        @Inject()
        private readonly standingService: StandingService,
        @Inject()
        private readonly roundService: RoundService,
        @Inject()
        private readonly uiUpdateGateway: UiUpdateGateway
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

    async FindMatchesForDivision(divisionId: number): Promise<MatchListDto[]> {
        const matches = await this.matchService.findByDivisionForView(divisionId);
        return matches.map((match) => ({
            id: match.id,
            name: match.name,
            subtitle: match.subtitle,
            notes: match.notes,
            scoringSystem: match.scoringSystem,
            entrants: (match.entrants ?? []).map((entrant) => ({
                id: entrant.id,
                name: entrant.name,
                type: entrant.type,
                seedNum: entrant.seedNum ?? null,
                status: entrant.status,
                participants: (entrant.participants ?? []).map((participant) => ({
                    id: participant.id,
                    roles: participant.roles ?? [],
                    status: participant.status,
                    player: {
                        id: participant.player.id,
                        playerName: participant.player.playerName,
                    },
                })),
            })),
            rounds: (match.rounds ?? []).map((round) => ({
                id: round.id,
                song: {
                    id: round.song.id,
                    title: round.song.title,
                },
                standings: (round.standings ?? []).map((standing) => ({
                    id: standing.id,
                    points: standing.points,
                    score: {
                        id: standing.score.id,
                        percentage: standing.score.percentage,
                        isFailed: standing.score.isFailed,
                        player: {
                            id: standing.score.player.id,
                            playerName: standing.score.player.playerName,
                        },
                        song: {
                            id: round.song.id,
                            title: round.song.title,
                        },
                    },
                })),
            })),
            targetPaths: match.targetPaths ?? [],
            sourcePaths: match.sourcePaths ?? [],
            phaseId: (match as Match & { phase?: { id?: number } }).phase?.id,
        }));
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

        for (const round of match.rounds ?? []) {
            for (const standing of round.standings ?? []) {
                if (playerIdsToRemove.includes(standing.score.player.id)) {
                    await this.standingService.delete(standing.id);
                }
            }
        }

        const remainingEntrantIds = (match.entrants ?? [])
            .filter(entrant => !entrant.participants?.some(participant => playerIdsToRemove.includes(participant.player.id)))
            .map(entrant => entrant.id);
        const dto = new UpdateMatchDto();
        dto.entrantIds = remainingEntrantIds;
        await this.matchService.update(matchId, dto);
    }

    async AddEntrantInMatch(matchId: number, entrantId: number): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;
        if ((match.entrants ?? []).some(entrant => entrant.id === entrantId)) return;
        const dto = new UpdateMatchDto();
        dto.entrantIds = [...(match.entrants ?? []).map(entrant => entrant.id), entrantId];
        await this.matchService.update(matchId, dto);
    }

    async RemoveEntrantInMatch(matchId: number, entrantId: number): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;
        const dto = new UpdateMatchDto();
        dto.entrantIds = (match.entrants ?? []).filter(entrant => entrant.id !== entrantId).map(entrant => entrant.id);
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

        await this.roundService.delete(round.id);
        match.rounds = match.rounds.filter(round => round.id == round.id);
        await this.uiUpdateGateway.emitMatchUpdateByMatchId(match.id);
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

        await this.uiUpdateGateway.emitMatchUpdateByMatchId(match.id);
        return match;
    }

    private async AddSongToMatch(match: Match, songId: number): Promise<void> {
        const round = await this.roundService.create(this.GetRoundDto(match, songId));

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
