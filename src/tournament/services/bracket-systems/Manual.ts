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
        division.phases = division.phases ?? [];
        const phase = await this.CreatePhase("Phase 1", division);
        phase.matches = [];
        const match = await this.CreateEmptyMatch("Match 1", "", phase.id);
        for (const player of players) {
            await this.AddPlayerToMatch(player, match.id);
        }
    }

    protected async createBracket(_orderedplayers: string[], _playerPerMatch: number, _division: Division) {
        // Manual bracket — no automatic structure
    }
}
