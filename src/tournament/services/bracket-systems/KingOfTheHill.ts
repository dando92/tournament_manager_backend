import { IBracketSystem } from "./IBracketSystem";
import { Division } from "@persistence/entities";

export class KingOfTheHill extends IBracketSystem {
    getName() : string {
        return "KingOfTheHill";
    }

    getDescription() : string {
        return "KingOfTheHill";
    }

    protected async createBracket(_orderedplayers: string[], _playerPerMatch: number, _division: Division) {
        // KingOfTheHill bracket — not yet implemented
    }
}
