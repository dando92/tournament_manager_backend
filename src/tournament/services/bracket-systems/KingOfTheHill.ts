import { IBracketSystem } from "./IBracketSystem";
import { Division, Player } from "@persistence/entities";

export class KingOfTheHill extends IBracketSystem {
    getName(): string {
        return "KingOfTheHill";
    }

    getDescription(): string {
        return "KingOfTheHill";
    }

    protected async createBracket(_players: Player[], _playerPerMatch: number, _division: Division): Promise<void> {
        // KingOfTheHill bracket — not yet implemented
    }
}
