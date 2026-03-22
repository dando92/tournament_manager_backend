import { Inject } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Manual } from "./Manual";
import { DoubleElimination } from "./DoubleElimination"
import { SingleElimination } from "./SingleElimination"
import { IBracketSystem } from "./IBracketSystem";
import { KingOfTheHill } from "./KingOfTheHill"
import { CreateMatchUseCase } from "../../use-cases/matches/create-match.use-case";
import { GetMatchUseCase } from "../../use-cases/matches/get-match.use-case";
import { UpdateMatchUseCase } from "../../use-cases/matches/update-match.use-case";
import { RemovePlayersFromMatchUseCase } from "../../use-cases/matches/remove-players-from-match.use-case";
import { CreateDivisionUseCase } from "../../use-cases/divisions/create-division.use-case";
import { DeleteStandingUseCase } from "../../use-cases/standings/delete-standing.use-case";

@Injectable()
export class BracketSystemProvider {
    private readonly systems: Map<string, IBracketSystem>;
    constructor(
        @Inject()
        private readonly createMatchUseCase: CreateMatchUseCase,
        @Inject()
        private readonly getMatchUseCase: GetMatchUseCase,
        @Inject()
        private readonly updateMatchUseCase: UpdateMatchUseCase,
        @Inject()
        private readonly removePlayersFromMatchUseCase: RemovePlayersFromMatchUseCase,
        @Inject()
        private readonly createDivisionUseCase: CreateDivisionUseCase,
        @Inject()
        private readonly deleteStandingUseCase: DeleteStandingUseCase,
    ) {
        const args: [CreateMatchUseCase, GetMatchUseCase, UpdateMatchUseCase, RemovePlayersFromMatchUseCase, CreateDivisionUseCase, DeleteStandingUseCase] =
            [createMatchUseCase, getMatchUseCase, updateMatchUseCase, removePlayersFromMatchUseCase, createDivisionUseCase, deleteStandingUseCase];

        const all: IBracketSystem[] = [
            new DoubleElimination(...args),
            new SingleElimination(...args),
            new KingOfTheHill(...args),
            new Manual(...args),
        ];
        this.systems = new Map(all.map(s => [s.getName(), s]));
    }

    getBracketSystem(name: string) : IBracketSystem {
        return this.systems.get(name);
    }

    getAll() : string[] {
        return Array.from(this.systems.keys());
    }
}
