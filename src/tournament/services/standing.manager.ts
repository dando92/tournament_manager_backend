import { Injectable, Inject } from "@nestjs/common";
import { SongCompletedPayload } from "../live-score.types"
import { CreateScoreDto, CreateStandingDto, UpdateScoreDto, UpdateStandingDto } from '../../tournament/dtos';
import { Match, Score } from '@persistence/entities';
import { ScoringSystemProvider } from "./scoring-systems/ScoringSystemProvider";
import * as path from 'path';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';
import { ILobbyStateObserver } from '../interfaces/lobby-state-observer.interface';
import { LobbyStatePayload } from '../itg-online.types';
import { CreateStandingUseCase } from '../use-cases/standings/create-standing.use-case';
import { UpdateStandingUseCase } from '../use-cases/standings/update-standing.use-case';
import { DeleteStandingUseCase } from '../use-cases/standings/delete-standing.use-case';
import { CreateScoreUseCase } from '../use-cases/scores/create-score.use-case';
import { UpdateScoreUseCase } from '../use-cases/scores/update-score.use-case';
import { MatchService } from '@match/services/match.service';
import { BracketManager } from '@bracket/bracket.manager';

@Injectable()
export class StandingManager implements ILobbyStateObserver {
    constructor(
        @Inject()
        private readonly createStandingUseCase: CreateStandingUseCase,
        @Inject()
        private readonly updateStandingUseCase: UpdateStandingUseCase,
        @Inject()
        private readonly deleteStandingUseCase: DeleteStandingUseCase,
        @Inject()
        private readonly createScoreUseCase: CreateScoreUseCase,
        @Inject()
        private readonly updateScoreUseCase: UpdateScoreUseCase,
        @Inject()
        private readonly matchService: MatchService,
        @Inject()
        private readonly scoringSystemProvider: ScoringSystemProvider,
        @Inject()
        private readonly uiUpdateGateway: UiUpdateGateway,
        @Inject()
        private readonly bracketManager: BracketManager,
    ) { }

    async AddScoreToMatchById(matchId: number, score: CreateScoreDto): Promise<Match> {
        const match = await this.matchService.getMatch(matchId)

        if (!match) {
            console.warn(`[StandingManager] No match found with id "${matchId}"`);
            return;
        }

        const actualScoreEntity = await this.createScoreUseCase.execute(score);

        return await this.AddScoreToMatch(match, actualScoreEntity);
    }

    async AddScoreToMatch(match: Match, score: Score): Promise<Match> {
        const round = match.rounds.find(round => round.song.id == score.song.id);

        if (!round) {
            return;
        }

        const alreadyExistentStanding = round.standings.find(
            standing => standing.score.song.id == score.song.id && standing.score.player.id == score.player.id
        );

        if (alreadyExistentStanding) {
            const updateStanding = new UpdateStandingDto();
            updateStanding.scoreId = score.id;
            updateStanding.points = 0;
        } else {
            const newStanding = new CreateStandingDto();
            newStanding.roundId = round.id;
            newStanding.scoreId = score.id;
            newStanding.points = 0;

            const standing = await this.createStandingUseCase.execute(newStanding);
            round.standings.push(standing);
        }

        const isRoundCompleted = match.players.every(player =>
            round.standings.some(
                s => s.score.player.id === player.id && s.score.song.id === round.song.id,
            ),
        );

        console.log(`[StandingManager]${score.player.playerName} ${score.song.title} standings length ${round.standings.length}`);

        if (isRoundCompleted) {
            const scoreSystem = this.scoringSystemProvider.getScoringSystem(match.scoringSystem);
            scoreSystem.recalc(round.standings);
            round.standings.forEach(async standing => {
                const dto = new UpdateStandingDto();
                dto.points = standing.points;
                await this.updateStandingUseCase.execute(standing.id, dto);
            });
        }

        const isMatchComplete = match.rounds.length > 0 && match.rounds.every(r =>
            match.players.every(player =>
                r.standings.some(s => s.score.player.id === player.id && s.score.song.id === r.song.id),
            ),
        );

        if (isMatchComplete && match.targetPaths?.length) {
            const getTotalPoints = (playerId: number) =>
                match.rounds.reduce((acc, r) => {
                    const standing = r.standings.find(s => s.score.player.id === playerId);
                    return acc + (standing?.points ?? 0);
                }, 0);

            const sortedPlayers = [...match.players].sort(
                (a, b) => getTotalPoints(b.id) - getTotalPoints(a.id),
            );

            await this.bracketManager.advancePlayers(match, sortedPlayers);

            for (const targetMatchId of match.targetPaths) {
                const targetMatch = await this.matchService.getMatch(targetMatchId);
                if (targetMatch) await this.uiUpdateGateway.emitMatchUpdateByMatchId(targetMatch.id);
            }
        }

        await this.uiUpdateGateway.emitMatchUpdateByMatchId(match.id);

        return match;
    }

    async RemoveStandingFromMatch(matchId: number, playerId: number, songId: number): Promise<Match> {
        const match = await this.matchService.getMatch(matchId);

        if (!match) {
            return;
        }

        const wasComplete = match.rounds.length > 0 && match.rounds.every(r =>
            match.players.every(player =>
                r.standings.some(s => s.score.player.id === player.id && s.score.song.id === r.song.id),
            ),
        );

        const getTotalPoints = (playerId: number) =>
            match.rounds.reduce((acc, r) => {
                const standing = r.standings.find(s => s.score.player.id === playerId);
                return acc + (standing?.points ?? 0);
            }, 0);

        const sortedPlayers = wasComplete && match.targetPaths?.length
            ? [...match.players].sort((a, b) => getTotalPoints(b.id) - getTotalPoints(a.id))
            : [];

        const round = match.rounds.find(round => round.song.id == songId);

        if (!round) {
            return;
        }

        try {
            let index = -1;

            for (let i = 0; i < round.standings.length; i++) {
                const standing = round.standings[i];

                if (standing.score.player.id == playerId && standing.score.song.id == songId) {
                    await this.deleteStandingUseCase.execute(standing.id);
                    index = i;
                }
            }

            if (index != -1) {
                round.standings.splice(index, 1);

                for (let i = 0; i < round.standings.length; i++) {
                    const standing = round.standings[i];
                    const dto = new UpdateStandingDto();
                    dto.points = 0;
                    await this.updateStandingUseCase.execute(standing.id, dto);
                    standing.points = 0;
                }
            }
        } catch (error) {
            console.log(error);
        }

        if (wasComplete && match.targetPaths?.length) {
            await this.bracketManager.revertPlayers(match, sortedPlayers);

            for (const targetMatchId of match.targetPaths) {
                const targetMatch = await this.matchService.getMatch(targetMatchId);
                if (targetMatch) await this.uiUpdateGateway.emitMatchUpdateByMatchId(targetMatch.id);
            }
        }

        await this.uiUpdateGateway.emitMatchUpdateByMatchId(match.id);

        return match;
    }

    async EditStandingInMatch(matchId: number, playerId: number, songId: number, percentage: number, isFailed: boolean): Promise<Match> {
        const match = await this.matchService.getMatch(matchId);

        if (!match) {
            return;
        }

        const wasComplete = match.rounds.length > 0 && match.rounds.every(r =>
            match.players.every(player =>
                r.standings.some(s => s.score.player.id === player.id && s.score.song.id === r.song.id),
            ),
        );

        const getTotalPoints = (pid: number) =>
            match.rounds.reduce((acc, r) => {
                const standing = r.standings.find(s => s.score.player.id === pid);
                return acc + (standing?.points ?? 0);
            }, 0);

        const oldSortedPlayers = wasComplete && match.targetPaths?.length
            ? [...match.players].sort((a, b) => getTotalPoints(b.id) - getTotalPoints(a.id))
            : [];

        const round = match.rounds.find(round => round.song.id == songId);

        if (!round) {
            return;
        }

        const standing = round.standings.find(s => s.score.player.id == playerId);

        if (!standing) {
            return;
        }

        const updateScoreDto = new UpdateScoreDto();
        updateScoreDto.percentage = percentage;
        updateScoreDto.isFailed = isFailed;
        await this.updateScoreUseCase.execute(standing.score.id, updateScoreDto);

        standing.score.percentage = percentage;
        standing.score.isFailed = isFailed;

        const scoreSystem = this.scoringSystemProvider.getScoringSystem(match.scoringSystem);
        scoreSystem.recalc(round.standings);

        for (const s of round.standings) {
            const dto = new UpdateStandingDto();
            dto.points = s.points;
            await this.updateStandingUseCase.execute(s.id, dto);
        }

        if (wasComplete && match.targetPaths?.length) {
            await this.bracketManager.revertPlayers(match, oldSortedPlayers);

            const newSortedPlayers = [...match.players].sort(
                (a, b) => getTotalPoints(b.id) - getTotalPoints(a.id),
            );
            await this.bracketManager.advancePlayers(match, newSortedPlayers);

            for (const targetMatchId of match.targetPaths) {
                const targetMatch = await this.matchService.getMatch(targetMatchId);
                if (targetMatch) await this.uiUpdateGateway.emitMatchUpdateByMatchId(targetMatch.id);
            }
        }

        await this.uiUpdateGateway.emitMatchUpdateByMatchId(match.id);

        return match;
    }

    async OnLobbyStateChanged(tournamentId: number, lobbyState: LobbyStatePayload, _lobbyId: string, _lobbyName: string): Promise<void> {
        const songPath = lobbyState.songInfo?.songPath ?? null;

        if (!songPath) return;

        for (const player of lobbyState.players) {
            const prog = player.songProgression;
            if (player.screenName === "ScreenEvaluation") {
                const match = await this._findMatchId(songPath, player.profileName);

                if (!match)
                    continue;

                const payload: CreateScoreDto = {
                    playerId: match.players.find(p => p.playerName == player.profileName).id,
                    songId: match.rounds.find(r => r.song.title == songPath).song.id,
                    percentage: player.score,
                    isFailed: player.isFailed ?? false,
                };

                await this.AddScoreToMatchById(match.id, payload);
            }
        }
    }

    private async _findMatchId(songPath: string, playerName: string): Promise<Match | null> {
        const matches = await this.matchService.findAll();
        
        const match = matches.find(
            (m) =>
                m.rounds?.some((r) => r.song?.title === songPath) &&
                m.players?.some((p) => p.playerName === playerName),
        );

        if (!match) {
            console.warn(`[StandingManager] No match found for song "${songPath}" and player "${playerName}"`);
            return null;
        }

        return match;
    }
}
