import { Inject } from "@nestjs/common";
import { Manual } from "./Manual";
import { DoubleElimination } from "./DoubleElimination"
import { SingleElimination } from "./SingleElimination"
import { IBracketSystem } from "./IBracketSystem";
import { KingOfTheHill } from "./KingOfTheHill"
import { CreateMatchUseCase } from "../../use-cases/matches/create-match.use-case";
import { GetMatchUseCase } from "../../use-cases/matches/get-match.use-case";
import { UpdateMatchUseCase } from "../../use-cases/matches/update-match.use-case";
import { RemovePlayersFromMatchUseCase } from "../../use-cases/matches/remove-players-from-match.use-case";
import { CreatePhaseUseCase } from "../../use-cases/phases/create-phase.use-case";
import { CreateDivisionUseCase } from "../../use-cases/divisions/create-division.use-case";
import { DeleteStandingUseCase } from "../../use-cases/standings/delete-standing.use-case";

export class BracketSystemProvider {
    systems: Map<string, IBracketSystem>;
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
        private readonly createPhaseUseCase: CreatePhaseUseCase,
        @Inject()
        private readonly createDivisionUseCase: CreateDivisionUseCase,
        @Inject()
        private readonly deleteStandingUseCase: DeleteStandingUseCase,
    ) {
        this.systems = new Map<string, IBracketSystem>();

        this.add(new DoubleElimination(createMatchUseCase, getMatchUseCase, updateMatchUseCase, removePlayersFromMatchUseCase, createPhaseUseCase, createDivisionUseCase, deleteStandingUseCase))
        this.add(new SingleElimination(createMatchUseCase, getMatchUseCase, updateMatchUseCase, removePlayersFromMatchUseCase, createPhaseUseCase, createDivisionUseCase, deleteStandingUseCase))
        this.add(new KingOfTheHill(createMatchUseCase, getMatchUseCase, updateMatchUseCase, removePlayersFromMatchUseCase, createPhaseUseCase, createDivisionUseCase, deleteStandingUseCase))

        this.add(new Manual(createMatchUseCase, getMatchUseCase, updateMatchUseCase, removePlayersFromMatchUseCase, createPhaseUseCase, createDivisionUseCase, deleteStandingUseCase))
    }
    
    add(bracketSystem: IBracketSystem): void {
        this.systems.set(bracketSystem.getName(), bracketSystem);
    }

    getBracketSystem(name: string) : IBracketSystem {
        return this.systems.get(name);
    }

    getAll() : string[] {
        return Array.from(this.systems.keys());
    }
}