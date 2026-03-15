import { Inject } from "@nestjs/common";
import { IBracketSystem } from "./IBracketSystem";
import { Division } from "@persistence/entities";

export class KingOfTheHill extends IBracketSystem {
    getName() : string {
        return "KingOfTheHill";
    }

    getDescription() : string {
        return "KingOfTheHill";
    }

    protected async createBracket(orderedplayers: string[], playerPerMatch: number, division: Division) {

    }
}