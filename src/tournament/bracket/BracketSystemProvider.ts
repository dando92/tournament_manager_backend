import { Inject, Injectable } from "@nestjs/common";
import { Manual } from "@bracket/Manual";
import { DoubleElimination } from "@bracket/DoubleElimination";
import { SingleElimination } from "@bracket/SingleElimination";
import { IBracketSystem } from "@bracket/IBracketSystem";
import { KingOfTheHill } from "@bracket/KingOfTheHill";
import { MatchService } from "@match/services/match.service";
import { CreateDivisionUseCase } from "@tournament/use-cases/divisions/create-division.use-case";
import { DeleteStandingUseCase } from "@tournament/use-cases/standings/delete-standing.use-case";
import { CreatePhaseUseCase } from "@tournament/use-cases/phases/create-phase.use-case";
import { MatchManager } from "@match/services/match.manager";

@Injectable()
export class BracketSystemProvider {
    private readonly systems: Map<string, IBracketSystem>;
    constructor(
        @Inject()
        private readonly matchService: MatchService,
        @Inject()
        private readonly matchManager: MatchManager,
        @Inject()
        private readonly createDivisionUseCase: CreateDivisionUseCase,
        @Inject()
        private readonly deleteStandingUseCase: DeleteStandingUseCase,
        @Inject()
        private readonly createPhaseUseCase: CreatePhaseUseCase,
    ) {
        const args: [MatchService, MatchManager, CreateDivisionUseCase, DeleteStandingUseCase, CreatePhaseUseCase] =
            [matchService, matchManager, createDivisionUseCase, deleteStandingUseCase, createPhaseUseCase];

        const all: IBracketSystem[] = [
            new DoubleElimination(...args),
            new SingleElimination(...args),
            new KingOfTheHill(...args),
            new Manual(...args),
        ];
        this.systems = new Map(all.map(s => [s.getName(), s]));
    }

    getBracketSystem(name: string): IBracketSystem {
        return this.systems.get(name);
    }

    getAll(): string[] {
        return Array.from(this.systems.keys());
    }
}
