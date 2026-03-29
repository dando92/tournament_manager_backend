import { Inject, Injectable } from "@nestjs/common";
import { BracketSystemProvider } from "@bracket/BracketSystemProvider";
import { MatchManager } from "@match/services/match.manager";
import { Match, Player } from "@persistence/entities";
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

    async generateForDivision(divisionId: number, bracketType: string, playerPerMatch: number): Promise<void> {
        const division = await this.divisionService.findOne(divisionId);
        const players = this.sortBySeed(
            division?.players ?? [],
            division?.seeding ?? []
        );
        const system = this.bracketSystemProvider.getBracketSystem(bracketType);
        await system.generateForDivision(division, players, playerPerMatch);
        const updateDto = Object.assign(new UpdateDivisionDto(), { playersPerMatch: playerPerMatch });
        await this.divisionService.update(divisionId, updateDto);
    }

    async revertPlayers(match: Match, sortedPlayers: Player[]): Promise<void> {
        if (!match.targetPaths)
            return;

        for (let i = 0; i < match.targetPaths.length; i++) {
            const targetMatchId = match.targetPaths[i];

            if (targetMatchId === 0)
                continue;

            await this.matchManager.RemovePlayerInMatch(match.targetPaths[i], sortedPlayers[i].id);
        }
    }

    async advancePlayers(match: Match, sortedPlayers: Player[]): Promise<void> {
        if (!match.targetPaths)
            return;

        for (let i = 0; i < match.targetPaths.length; i++) {
            const targetMatchId = match.targetPaths[i];

            if (targetMatchId === 0)
                continue;

            await this.matchManager.AddPlayerInMatch(targetMatchId, sortedPlayers[i].id);
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
