import { IBracketSystem } from "./IBracketSystem";
import { Division, Player } from "@persistence/entities";

export class Manual extends IBracketSystem {
    getName(): string {
        return "Manual";
    }

    getDescription(): string {
        return "Manual";
    }

    async generateForDivision(division: Division, players: Player[], playerPerMatch: number): Promise<void> {
        division.matches = division.matches ?? [];
        const matchCount = Math.ceil(players.length / playerPerMatch);
        const matches = await this.CreateMatchesInDivision("Match", division, matchCount);
        await this.fillFirstWave(players, matches, playerPerMatch);
    }

    protected async createBracket(_players: Player[], _playerPerMatch: number, _division: Division): Promise<void> {
        // Manual bracket — no automatic structure
    }
}
