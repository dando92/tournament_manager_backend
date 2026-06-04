import { Inject, Injectable } from '@nestjs/common';
import { UpdateMatchDto, UpdateMatchStateDto } from '@match/dtos/match.dto';
import { Match, MatchResultEntry, MatchState } from '@persistence/entities';
import { MatchResultService } from '@match/services/match-result.service';
import { MatchService } from '@match/services/match.service';
import { AdvancementManager } from '@match/services/advancement.manager';

@Injectable()
export class MatchStateManager {
    constructor(
        @Inject()
        private readonly matchService: MatchService,
        @Inject()
        private readonly matchResultService: MatchResultService,
        @Inject()
        private readonly advancementManager: AdvancementManager,
    ) {}

    async UpdateMatchState(matchId: number, dto: UpdateMatchStateDto): Promise<Match> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) throw new Error(`Match ${matchId} not found`);

        switch (dto.state) {
            case MatchState.NotActive:
                await this.setMatchState(match, MatchState.NotActive);
                break;
            case MatchState.Active:
                if (this.getEffectiveMatchState(match) === MatchState.Completed) {
                    throw new Error('Completed matches must be re-opened before activation');
                }
                await this.setMatchState(match, MatchState.Active);
                break;
            case MatchState.Pending:
                await this.reopenMatch(match);
                break;
            case MatchState.Completed:
                await this.completeMatch(match);
                break;
            default:
                throw new Error(`Unsupported match state "${dto.state}"`);
        }

        return await this.matchService.getMatch(matchId);
    }

    async SyncMatchStateFromStandingsById(matchId: number): Promise<Match | null> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return null;

        await this.SyncMatchStateFromStandings(match);
        return match;
    }

    async SyncMatchStateFromStandings(match: Match): Promise<void> {
        if (this.getEffectiveMatchState(match) === MatchState.Completed) {
            return;
        }

        const isComplete = Boolean(this.buildMatchResultPlayerPoints(match));
        if (isComplete) {
            await this.setMatchState(match, MatchState.Pending);
            return;
        }

        if (this.getEffectiveMatchState(match) === MatchState.Pending) {
            await this.setMatchState(match, MatchState.Active);
        }
    }

    async AddEntrantInMatch(matchId: number, entrantId: number): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;
        if ((match.entrants ?? []).some(entrant => entrant.id === entrantId)) return;

        const dto = new UpdateMatchDto();
        dto.entrantIds = [...(match.entrants ?? []).map(entrant => entrant.id), entrantId];
        await this.matchService.update(matchId, dto);
        await this.SyncMatchStateFromStandingsById(matchId);
    }

    async RemoveEntrantInMatch(matchId: number, entrantId: number): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;

        const dto = new UpdateMatchDto();
        dto.entrantIds = (match.entrants ?? []).filter(entrant => entrant.id !== entrantId).map(entrant => entrant.id);
        await this.matchService.update(matchId, dto);
        await this.SyncMatchStateFromStandingsById(matchId);
    }

    getEffectiveMatchState(match: Match): MatchState {
        if (match.matchResult && match.state !== MatchState.Completed) {
            return MatchState.Completed;
        }

        return match.state ?? MatchState.NotActive;
    }

    private async completeMatch(match: Match): Promise<void> {
        const playerPoints = this.buildMatchResultPlayerPoints(match);
        if (!playerPoints) {
            throw new Error(`Match ${match.id} cannot be completed because not all standings are populated`);
        }

        if (this.hasMatchResult(match)) {
            await this.advancementManager.RevertAdvancementFromMatch(match);
        }

        match.matchResult = await this.matchResultService.upsertForMatch(match.id, playerPoints);
        await this.setMatchState(match, MatchState.Completed);

        await this.advancementManager.AdvanceFromCompletedMatch(match);
    }

    private async reopenMatch(match: Match): Promise<void> {
        if (this.hasMatchResult(match)) {
            await this.advancementManager.RevertAdvancementFromMatch(match);
        }

        if (match.matchResult) {
            await this.matchResultService.deleteForMatch(match.id);
            match.matchResult = null;
        }

        await this.setMatchState(match, MatchState.Pending);
    }

    private async setMatchState(match: Match, state: MatchState): Promise<void> {
        if (match.state === state) return;

        await this.matchService.updateState(match.id, state);
        match.state = state;
    }

    private hasMatchResult(match: Match): boolean {
        return Boolean(match.matchResult);
    }

    private buildMatchResultPlayerPoints(match: Match): MatchResultEntry[] | null {
        const singlesEntrants = (match.entrants ?? []).filter((entrant) => entrant.type === 'player');
        if (singlesEntrants.length === 0 || (match.rounds?.length ?? 0) === 0) {
            return null;
        }

        const playerIds = singlesEntrants
            .map((entrant) => entrant.participants?.[0]?.player?.id)
            .filter((playerId): playerId is number => Number.isFinite(playerId));
        if (playerIds.length === 0) {
            return null;
        }

        const everyStandingPresent = (match.rounds ?? []).every((round) =>
            playerIds.every((playerId) =>
                (round.standings ?? []).some((standing) => standing.score.player.id === playerId),
            ),
        );
        if (!everyStandingPresent) {
            return null;
        }

        const playerPoints = playerIds.map((playerId) => ({
            playerId,
            points: (match.rounds ?? []).reduce((acc, round) => {
                const standing = (round.standings ?? []).find((candidate) => candidate.score.player.id === playerId);
                return acc + (standing?.points ?? 0);
            }, 0),
        }));

        return playerPoints.sort((left, right) => right.points - left.points || left.playerId - right.playerId);
    }
}
