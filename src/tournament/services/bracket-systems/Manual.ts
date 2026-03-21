import { IBracketSystem } from "./IBracketSystem";
import { Division, Player } from "@persistence/entities";

export class Manual extends IBracketSystem {
    getName() : string {
        return "Manual";
    }

    getDescription() : string {
        return "Manual";
    }

    async generateForDivision(division: Division, players: Player[], _playerPerMatch: number): Promise<void> {
        division.matches = division.matches ?? [];
        const matches = await this.CreateMatchesInDivision("Match", division, 1);
        for (const player of players) {
            await this.AddPlayerToMatch(player, matches[0].id);
        }
    }

    protected async createBracket(_orderedplayers: string[], _playerPerMatch: number, _division: Division) {
        // Manual bracket — no automatic structure
    }
}
