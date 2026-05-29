import { Inject, Injectable } from "@nestjs/common";
import { BracketSystemProvider } from "@bracket/BracketSystemProvider";
import { UpdateDivisionDto } from "@tournament/dtos";
import { DivisionService } from "@tournament/services/division.service";

type WithId = { id: number | string };

@Injectable()
export class BracketManager {
    constructor(
        @Inject()
        private readonly bracketSystemProvider: BracketSystemProvider,
        @Inject()
        private readonly divisionService: DivisionService,
    ) { }

    getBracketTypes(): string[] {
        return this.bracketSystemProvider.getAll();
    }

    async generateForDivision(divisionId: number, bracketType: string, playerPerMatch: number): Promise<void> {
        const division = await this.divisionService.findOneForBracketGeneration(divisionId);
        if (!division) {
            throw new Error(`Division ${divisionId} not found`);
        }
        const entrants = this.sortBySeed(
            (division?.entrants ?? []).filter((entrant) => entrant.status === 'active' && entrant.type === 'player'),
            (division?.entrants ?? []).map((entrant) => entrant.id).sort((a, b) => {
                const left = division.entrants.find((entrant) => entrant.id === a)?.seedNum ?? Number.MAX_SAFE_INTEGER;
                const right = division.entrants.find((entrant) => entrant.id === b)?.seedNum ?? Number.MAX_SAFE_INTEGER;
                return left - right;
            })
        );
        const system = this.bracketSystemProvider.getBracketSystem(bracketType);
        await system.generateForDivision(division, entrants, playerPerMatch);
        const updateDto = Object.assign(new UpdateDivisionDto(), { playersPerMatch: playerPerMatch });
        await this.divisionService.update(divisionId, updateDto);
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
