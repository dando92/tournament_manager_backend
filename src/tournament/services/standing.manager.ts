import { Injectable, Inject } from "@nestjs/common";
import { SongCompletedPayload } from "../live-score.types"
import { CreateScoreDto, CreateStandingDto, UpdateScoreDto, UpdateStandingDto } from '../../tournament/dtos';
import { Match, Score } from '@persistence/entities';
import { ScoringSystemProvider } from "./scoring-systems/ScoringSystemProvider";
import * as path from 'path';
import { MatchGateway } from '../gateways/match.gateway';
import { ILobbyStateObserver } from '../interfaces/lobby-state-observer.interface';
import { LobbyStatePayload } from '../itg-online.types';
import { CreateStandingUseCase } from '../use-cases/standings/create-standing.use-case';
import { UpdateStandingUseCase } from '../use-cases/standings/update-standing.use-case';
import { DeleteStandingUseCase } from '../use-cases/standings/delete-standing.use-case';
import { CreateScoreUseCase } from '../use-cases/scores/create-score.use-case';
import { UpdateScoreUseCase } from '../use-cases/scores/update-score.use-case';
import { GetSongByNameUseCase } from '../use-cases/songs/get-song-by-name.use-case';
import { GetPlayerByNameUseCase } from '../use-cases/players/get-player-by-name.use-case';
import { GetMatchUseCase } from '../use-cases/matches/get-match.use-case';
import { GetMatchesUseCase } from '../use-cases/matches/get-matches.use-case';
import { BracketSystemProvider } from './bracket-systems/BracketSystemProvider';

type TournamentSongState = {
    currentSongPath: string | null;
    completedSongs: Set<string>;
};

@Injectable()
export class StandingManager implements ILobbyStateObserver {
    private tournamentSongState = new Map<number, TournamentSongState>();

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
        private readonly getSongByNameUseCase: GetSongByNameUseCase,
        @Inject()
        private readonly getPlayerByNameUseCase: GetPlayerByNameUseCase,
        @Inject()
        private readonly getMatchUseCase: GetMatchUseCase,
        @Inject()
        private readonly getMatchesUseCase: GetMatchesUseCase,
        @Inject()
        private readonly scoringSystemProvider: ScoringSystemProvider,
        @Inject()
        private readonly matchGateway: MatchGateway,
        @Inject()
        private readonly bracketSystemProvider: BracketSystemProvider,
    ) { }

    async AddScoreToMatchById(matchId: number, score: CreateScoreDto): Promise<Match> {
        const match = await this.getMatchUseCase.execute(matchId)

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

            await this.bracketSystemProvider.advancePlayers(match, sortedPlayers);

            for (const targetMatchId of match.targetPaths) {
                const targetMatch = await this.getMatchUseCase.execute(targetMatchId);
                if (targetMatch) await this.matchGateway.OnMatchUpdate(targetMatch);
            }
        }

        await this.matchGateway.OnMatchUpdate(match);

        return match;
    }

    async RemoveStandingFromMatch(matchId: number, playerId: number, songId: number): Promise<Match> {
        const match = await this.getMatchUseCase.execute(matchId);

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
            await this.bracketSystemProvider.revertPlayers(match, sortedPlayers);

            for (const targetMatchId of match.targetPaths) {
                const targetMatch = await this.getMatchUseCase.execute(targetMatchId);
                if (targetMatch) await this.matchGateway.OnMatchUpdate(targetMatch);
            }
        }

        await this.matchGateway.OnMatchUpdate(match);

        return match;
    }

    async EditStandingInMatch(matchId: number, playerId: number, songId: number, percentage: number, isFailed: boolean): Promise<Match> {
        const match = await this.getMatchUseCase.execute(matchId);

        if (!match) {
            return;
        }

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

        await this.matchGateway.OnMatchUpdate(match);

        return match;
    }

    async OnLobbyStateChanged(tournamentId: number, lobbyState: LobbyStatePayload, _lobbyId: string, _lobbyName: string): Promise<void> {
        const songPath = lobbyState.songInfo?.songPath ?? null;

        let state = this.tournamentSongState.get(tournamentId);
        if (!state) {
            state = { currentSongPath: null, completedSongs: new Set() };
            this.tournamentSongState.set(tournamentId, state);
        }

        if (songPath !== state.currentSongPath) {
            state.currentSongPath = songPath;
            state.completedSongs.clear();
        }

        if (!songPath) return;

        for (const player of lobbyState.players) {
            const prog = player.songProgression;
            if (prog && prog.totalTime > 0 && prog.currentTime >= prog.totalTime) {
                const key = `${player.profileName}:${songPath}`;
                if (!state.completedSongs.has(key)) {
                    state.completedSongs.add(key);
                    const payload: SongCompletedPayload = {
                        playerName: player.profileName,
                        songPath,
                        scorePercent: this.normalizePercent(player.score),
                        isFailed: false,
                    };
                    console.log(`[StandingManager] Song completed: ${player.profileName} — ${songPath} (${payload.scorePercent.toFixed(2)}%)`);
                    await this.HandleSongCompleted(payload);
                }
            }
        }
    }

    async HandleSongCompleted(payload: SongCompletedPayload) {
        const song = await this.getSongByNameUseCase.execute(path.basename(payload.songPath));

        if (!song) {
            console.warn(`[StandingManager] Song not found for path: ${payload.songPath}`);
            return;
        }

        const player = await this.getPlayerByNameUseCase.execute(payload.playerName);

        if (!player) {
            console.warn(`[StandingManager] Player not found: ${payload.playerName}`);
            return;
        }

        const matches = await this.getMatchesUseCase.execute();
        const match = matches.find(
            (m) =>
                m.rounds?.some((r) => r.song?.id === song.id) &&
                m.players?.some((p) => p.id === player.id),
        );

        if (!match) {
            console.warn(`[StandingManager] No match found for song "${song.title}" and player "${player.playerName}"`);
            return;
        }

        const newScore = new CreateScoreDto();
        newScore.playerId = player.id;
        newScore.songId = song.id;
        newScore.percentage = payload.scorePercent;
        newScore.isFailed = payload.isFailed;

        const actualScoreEntity = await this.createScoreUseCase.execute(newScore);

        await this.AddScoreToMatch(match, actualScoreEntity);
    }

    private normalizePercent(value: number | undefined): number {
        if (value === undefined || !Number.isFinite(value)) return 0;
        const scaled = value <= 1 ? value * 100 : value;
        return Math.max(0, Math.min(100, scaled));
    }
}
