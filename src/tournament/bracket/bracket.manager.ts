import { Inject, Injectable } from "@nestjs/common";
import { BracketSystemProvider } from "@bracket/BracketSystemProvider";
import { MatchManager } from "@match/services/match.manager";
import { Entrant, Match } from "@persistence/entities";
import { UpdateDivisionDto } from "@tournament/dtos";
import { DivisionService } from "@tournament/services/division.service";

type WithId = { id: number | string };

@Injectable()
export class BracketManager {
    constructor(
        @Inject()
        private readonly bracketSystemProvider: BracketSystemProvider,
        @Inject()
        private readonly matchManager: MatchManager,
        @Inject()
        private readonly divisionService: DivisionService,
    ) { }

    getBracketTypes(): string[] {
        return this.bracketSystemProvider.getAll();
    }

    private getDivisionSeeding(division: {
        entrants?: Entrant[];
        phases?: Array<{ id: number; seeds?: Array<{ entrant?: Entrant; entrantId?: number; seedNum: number }> }>;
    }): number[] {
        const seededPhase = [...(division.phases ?? [])]
            .sort((left, right) => left.id - right.id)
            .find((phase) => (phase.seeds?.length ?? 0) > 0);

        if (!seededPhase) {
            return (division.entrants ?? []).map((entrant) => entrant.id);
        }

        return [...(seededPhase.seeds ?? [])]
            .sort((left, right) => left.seedNum - right.seedNum)
            .map((seed) => seed.entrant?.id ?? seed.entrantId ?? null)
            .filter((entrantId): entrantId is number => Number.isFinite(entrantId));
    }

    async generateForDivision(divisionId: number, bracketType: string, playerPerMatch: number): Promise<void> {
        const division = await this.divisionService.findOneForBracketGeneration(divisionId);
        if (!division) {
            throw new Error(`Division ${divisionId} not found`);
        }
        const entrants = this.sortBySeed(
            (division?.entrants ?? []).filter((entrant) => entrant.status === 'active' && entrant.type === 'player'),
            this.getDivisionSeeding(division),
        );
        const system = this.bracketSystemProvider.getBracketSystem(bracketType);
        await system.generateForDivision(division, entrants, playerPerMatch);
        const updateDto = Object.assign(new UpdateDivisionDto(), { playersPerMatch: playerPerMatch });
        await this.divisionService.update(divisionId, updateDto);
    }

    async revertEntrants(match: Match, sortedEntrants: Entrant[]): Promise<void> {
        if (!match.targetPaths)
            return;

        for (let i = 0; i < match.targetPaths.length; i++) {
            const targetMatchId = match.targetPaths[i];

            if (targetMatchId === 0)
                continue;

            await this.matchManager.RemoveEntrantInMatch(match.targetPaths[i], sortedEntrants[i].id);
        }
    }

    async advanceEntrants(match: Match, sortedEntrants: Entrant[]): Promise<void> {
        if (!match.targetPaths)
            return;

        for (let i = 0; i < match.targetPaths.length; i++) {
            const targetMatchId = match.targetPaths[i];

            if (targetMatchId === 0)
                continue;

            await this.matchManager.AddEntrantInMatch(targetMatchId, sortedEntrants[i].id);
        }
    }

    sortBySeed<T extends WithId>(
        items: T[],
        seeding: (number | string)[]
    ): T[] {
        if (!seeding || seeding.length === 0) return items;

        const map = new Map(items.map(item => [item.id, item]));
        const result: T[] = [];

        // Add seeded players in order
        for (const id of seeding) {
            const item = map.get(id);
            if (item) {
                result.push(item);
                map.delete(id); // avoid duplicates later
            }
        }

        // Add remaining players (not in seeding)
        for (const item of items) {
            if (map.has(item.id)) {
                result.push(item);
            }
        }

        return result;
    }
}
