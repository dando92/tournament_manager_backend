import { Injectable, Inject } from "@nestjs/common";
import { CreateScoreDto, CreateStandingDto, UpdateScoreDto, UpdateStandingDto } from '../dtos';
import { Match, Player, Score } from '@persistence/entities';
import { ScoringSystemProvider } from "../services/scoring-systems/ScoringSystemProvider";
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';
import { ILobbyStateObserver } from '../interfaces/lobby-state-observer.interface';
import { LobbyStatePayload } from '@syncstart/index';
import { MatchService } from '@match/services/match.service';
import { MatchManager } from '@match/services/match.manager';
import { BracketManager } from '@bracket/bracket.manager';
import { ScoreService } from '../services/score.service';
import { StandingService } from './standing.service';

@Injectable()
export class StandingManager implements ILobbyStateObserver {
    constructor(
        @Inject()
        private readonly standingService: StandingService,
        @Inject()
        private readonly matchService: MatchService,
        @Inject()
        private readonly matchManager: MatchManager,
        @Inject()
        private readonly scoreService: ScoreService,
        @Inject()
        private readonly scoringSystemProvider: ScoringSystemProvider,
        @Inject()
        private readonly uiUpdateGateway: UiUpdateGateway,
        @Inject()
        private readonly bracketManager: BracketManager,
    ) { }

    async AddScoreToMatchById(matchId: number, score: CreateScoreDto): Promise<Match> {
        const match = await this.matchService.getMatch(matchId);

        if (!match) {
            console.warn(`[StandingManager] No match found with id "${matchId}"`);
            return;
        }

        const actualScoreEntity = await this.scoreService.create(score);

        return await this.AddScoreToMatch(match, actualScoreEntity);
    }

    async AddScoreToMatch(match: Match, score: Score): Promise<Match> {
        const round = match.rounds.find((candidate) => candidate.song.id == score.song.id);

        if (!round) {
            return;
        }

        const alreadyExistentStanding = round.standings.find(
            (standing) => standing.score.song.id == score.song.id && standing.score.player.id == score.player.id,
        );

        if (alreadyExistentStanding) {
            const updateStanding = new UpdateStandingDto();
            updateStanding.scoreId = score.id;
            updateStanding.points = 0;
            await this.standingService.update(alreadyExistentStanding.id, updateStanding);
            alreadyExistentStanding.score = score;
            alreadyExistentStanding.points = 0;
        } else {
            const newStanding = new CreateStandingDto();
            newStanding.roundId = round.id;
            newStanding.scoreId = score.id;
            newStanding.points = 0;

            const standing = await this.standingService.create(newStanding);
            round.standings.push(standing);
        }

        const matchPlayers = this.getSinglesPlayers(match);
        const isRoundCompleted = matchPlayers.every((player) =>
            round.standings.some(
                (standing) => standing.score.player.id === player.id && standing.score.song.id === round.song.id,
            ),
        );

        console.log(`[StandingManager]${score.player.playerName} ${score.song.title} standings length ${round.standings.length}`);

        if (isRoundCompleted) {
            const scoreSystem = this.scoringSystemProvider.getScoringSystem(match.scoringSystem);
            scoreSystem.recalc(round.standings);
            round.standings.forEach(async (standing) => {
                const dto = new UpdateStandingDto();
                dto.points = standing.points;
                await this.standingService.update(standing.id, dto);
            });
        }

        await this.refreshRoutesFromMatchResult(match);
        await this.uiUpdateGateway.emitMatchUpdateByMatchId(match.id);

        return match;
    }

    async RemoveStandingFromMatch(matchId: number, playerId: number, songId: number): Promise<Match> {
        const match = await this.matchService.getMatch(matchId);

        if (!match) {
            return;
        }

        const round = match.rounds.find((candidate) => candidate.song.id == songId);

        if (!round) {
            return;
        }

        try {
            let index = -1;

            for (let i = 0; i < round.standings.length; i++) {
                const standing = round.standings[i];

                if (standing.score.player.id == playerId && standing.score.song.id == songId) {
                    await this.standingService.delete(standing.id);
                    index = i;
                }
            }

            if (index != -1) {
                round.standings.splice(index, 1);

                for (let i = 0; i < round.standings.length; i++) {
                    const standing = round.standings[i];
                    const dto = new UpdateStandingDto();
                    dto.points = 0;
                    await this.standingService.update(standing.id, dto);
                    standing.points = 0;
                }
            }
        } catch (error) {
            console.log(error);
        }

        await this.refreshRoutesFromMatchResult(match);
        await this.uiUpdateGateway.emitMatchUpdateByMatchId(match.id);

        return match;
    }

    async EditStandingInMatch(matchId: number, playerId: number, songId: number, percentage: number, isFailed: boolean): Promise<Match> {
        const match = await this.matchService.getMatch(matchId);

        if (!match) {
            return;
        }

        const round = match.rounds.find((candidate) => candidate.song.id == songId);

        if (!round) {
            return;
        }

        const standing = round.standings.find((candidate) => candidate.score.player.id == playerId);

        if (!standing) {
            return;
        }

        const updateScoreDto = new UpdateScoreDto();
        updateScoreDto.percentage = percentage;
        updateScoreDto.isFailed = isFailed;
        await this.scoreService.update(standing.score.id, updateScoreDto);

        standing.score.percentage = percentage;
        standing.score.isFailed = isFailed;

        const scoreSystem = this.scoringSystemProvider.getScoringSystem(match.scoringSystem);
        scoreSystem.recalc(round.standings);

        for (const currentStanding of round.standings) {
            const dto = new UpdateStandingDto();
            dto.points = currentStanding.points;
            await this.standingService.update(currentStanding.id, dto);
        }

        await this.refreshRoutesFromMatchResult(match);
        await this.uiUpdateGateway.emitMatchUpdateByMatchId(match.id);

        return match;
    }

    async OnLobbyStateChanged(tournamentId: number, lobbyState: LobbyStatePayload, _lobbyCode: string, _lobbyName: string): Promise<void> {
        const songPath = lobbyState.songInfo?.songPath ?? null;

        if (!songPath) return;

        for (const player of lobbyState.players) {
            if (player.screenName === "ScreenEvaluationStage") {
                const match = await this.findMatch(songPath, player.profileName);

                if (!match) {
                    continue;
                }

                const matchPlayer = this.getSinglesPlayers(match).find((candidate) => candidate.playerName == player.profileName);
                const matchRound = match.rounds.find((candidate) => candidate.song.title == songPath);
                if (!matchPlayer || !matchRound) continue;

                const payload: CreateScoreDto = {
                    playerId: matchPlayer.id,
                    songId: matchRound.song.id,
                    percentage: player.score,
                    isFailed: player.isFailed ?? false,
                };

                await this.AddScoreToMatchById(match.id, payload);
            }
        }
    }

    private async refreshRoutesFromMatchResult(match: Match): Promise<void> {
        const hadMatchResult = this.matchManager.HasMatchResult(match);
        const previousSortedEntrants = hadMatchResult && match.targetPaths?.length
            ? this.matchManager.SortEntrantsByMatchResult(match)
            : [];

        if (hadMatchResult && match.targetPaths?.length) {
            await this.bracketManager.revertEntrants(match, previousSortedEntrants);
        }

        await this.matchManager.SyncMatchResult(match);

        if (this.matchManager.HasMatchResult(match) && match.targetPaths?.length) {
            const nextSortedEntrants = this.matchManager.SortEntrantsByMatchResult(match);
            await this.bracketManager.advanceEntrants(match, nextSortedEntrants);
        }

        for (const targetMatchId of match.targetPaths ?? []) {
            const targetMatch = await this.matchService.getMatch(targetMatchId);
            if (targetMatch) {
                await this.uiUpdateGateway.emitMatchUpdateByMatchId(targetMatch.id);
            }
        }
    }

    private async findMatch(songPath: string, playerName: string): Promise<Match | null> {
        const matches = await this.matchService.findAll();

        const match = matches.find(
            (candidate) =>
                candidate.rounds?.some((round) => round.song?.title === songPath) &&
                this.getSinglesPlayers(candidate).some((player) => player.playerName === playerName),
        );

        if (!match) {
            console.warn(`[StandingManager] No match found for song "${songPath}" and player "${playerName}"`);
            return null;
        }

        return match;
    }

    private getSinglesPlayers(match: Match): Player[] {
        return (match.entrants ?? [])
            .filter((entrant) => entrant.type === 'player')
            .map((entrant) => entrant.participants?.[0]?.player)
            .filter(Boolean);
    }
}
