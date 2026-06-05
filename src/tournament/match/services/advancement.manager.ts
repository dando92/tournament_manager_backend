import { Inject, Injectable } from '@nestjs/common';
import { UpdateMatchDto } from '@match/dtos/match.dto';
import { AdvancementRule, Entrant, Match } from '@persistence/entities';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';
import { MatchService } from '@match/services/match.service';
import { AdvancementRuleService } from '@tournament/services/advancement-rule.service';

@Injectable()
export class AdvancementManager {
    constructor(
        @Inject()
        private readonly matchService: MatchService,
        @Inject()
        private readonly advancementRuleService: AdvancementRuleService,
        @Inject()
        private readonly uiUpdateGateway: UiUpdateGateway,
    ) {}

    async AdvanceFromCompletedMatch(match: Match): Promise<void> {
        const advancementRules = await this.advancementRuleService.findBySource('match', match.id);
        if (advancementRules.length === 0) return;

        await this.advanceEntrantsFromMatchResult(match, advancementRules);
        await this.emitTargetMatchUpdates(advancementRules);
    }

    async RevertAdvancementFromMatch(match: Match): Promise<void> {
        const advancementRules = await this.advancementRuleService.findBySource('match', match.id);
        if (advancementRules.length === 0) return;

        await this.revertEntrantsFromMatchResult(match, advancementRules);
        await this.emitTargetMatchUpdates(advancementRules);
    }

    private async advanceEntrantsFromMatchResult(match: Match, advancementRules: AdvancementRule[]): Promise<void> {
        const sortedEntrants = this.sortEntrantsByMatchResult(match);
        for (const rule of advancementRules) {
            const entrant = sortedEntrants[rule.sourcePlacement - 1];
            if (!entrant || rule.targetKind !== 'match') continue;
            await this.placeEntrantInMatchSlot(rule.targetId, entrant.id, rule.targetSlot);
        }
    }

    private async revertEntrantsFromMatchResult(match: Match, advancementRules: AdvancementRule[]): Promise<void> {
        const sortedEntrants = this.sortEntrantsByMatchResult(match);
        for (const rule of advancementRules) {
            const entrant = sortedEntrants[rule.sourcePlacement - 1];
            if (!entrant || rule.targetKind !== 'match') continue;
            await this.removeEntrantInMatch(rule.targetId, entrant.id);
        }
    }

    private async placeEntrantInMatchSlot(matchId: number, entrantId: number, targetSlot: number): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;

        const targetIndex = Math.max(targetSlot - 1, 0);
        const entrantIds = (match.entrants ?? [])
            .map(entrant => entrant.id)
            .filter(id => id !== entrantId);

        if (targetIndex >= entrantIds.length) {
            entrantIds.push(entrantId);
        } else {
            entrantIds.splice(targetIndex, 0, entrantId);
        }

        const dto = new UpdateMatchDto();
        dto.entrantIds = entrantIds;
        await this.matchService.update(matchId, dto);
    }

    private async removeEntrantInMatch(matchId: number, entrantId: number): Promise<void> {
        const match = await this.matchService.getMatch(matchId);
        if (!match) return;

        const dto = new UpdateMatchDto();
        dto.entrantIds = (match.entrants ?? [])
            .filter(entrant => entrant.id !== entrantId)
            .map(entrant => entrant.id);
        await this.matchService.update(matchId, dto);
    }

    private async emitTargetMatchUpdates(advancementRules: AdvancementRule[]): Promise<void> {
        const targetMatchIds = Array.from(new Set(
            advancementRules
                .filter(rule => rule.targetKind === 'match')
                .map(rule => rule.targetId),
        ));

        for (const targetMatchId of targetMatchIds) {
            const targetMatch = await this.matchService.getMatch(targetMatchId);
            if (targetMatch) {
                await this.uiUpdateGateway.emitMatchUpdateByMatchId(targetMatch.id);
            }
        }
    }

    private sortEntrantsByMatchResult(match: Match): Entrant[] {
        const playerPoints = new Map(
            (match.matchResult?.playerPoints ?? []).map((entry) => [entry.playerId, entry.points]),
        );

        return [...(match.entrants ?? [])].sort((left, right) => {
            const leftPlayerId = left.participants?.[0]?.player?.id;
            const rightPlayerId = right.participants?.[0]?.player?.id;
            return (playerPoints.get(rightPlayerId) ?? 0) - (playerPoints.get(leftPlayerId) ?? 0);
        });
    }
}
