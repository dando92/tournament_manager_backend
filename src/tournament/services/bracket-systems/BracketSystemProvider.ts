import { Inject, Injectable } from "@nestjs/common";
import { Manual } from "./Manual";
import { DoubleElimination } from "./DoubleElimination"
import { SingleElimination } from "./SingleElimination"
import { IBracketSystem } from "./IBracketSystem";
import { Match, Player } from "@persistence/entities";
import { KingOfTheHill } from "./KingOfTheHill"
import { RemovePlayersFromMatchUseCase } from "../../use-cases/matches/remove-players-from-match.use-case";
import { MatchService } from "../match.service";
import { CreateDivisionUseCase } from "../../use-cases/divisions/create-division.use-case";
import { DeleteStandingUseCase } from "../../use-cases/standings/delete-standing.use-case";
import { CreatePhaseUseCase } from "../../use-cases/phases/create-phase.use-case";
import { UpdateMatchDto } from "../../dtos";
import { MatchManager } from "../match.manager";

@Injectable()
export class BracketSystemProvider {
    private readonly systems: Map<string, IBracketSystem>;
    constructor(
        @Inject()
        private readonly matchService: MatchService,
        @Inject()
        private readonly matchManager: MatchManager,
        @Inject()
        private readonly removePlayersFromMatchUseCase: RemovePlayersFromMatchUseCase,
        @Inject()
        private readonly createDivisionUseCase: CreateDivisionUseCase,
        @Inject()
        private readonly deleteStandingUseCase: DeleteStandingUseCase,
        @Inject()
        private readonly createPhaseUseCase: CreatePhaseUseCase,
    ) {
        const args: [MatchService, MatchManager, RemovePlayersFromMatchUseCase, CreateDivisionUseCase, DeleteStandingUseCase, CreatePhaseUseCase] =
            [matchService, matchManager, removePlayersFromMatchUseCase, createDivisionUseCase, deleteStandingUseCase, createPhaseUseCase];

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

    async revertPlayers(match: Match, sortedPlayers: Player[]): Promise<void> {
        if (!match.targetPaths?.length) return;

        const revertCount = Math.min(match.targetPaths.length, sortedPlayers.length);
        for (let i = 0; i < revertCount; i++) {
            const player = sortedPlayers[i];
            const targetMatchId = match.targetPaths[i];

            await this.removePlayersFromMatchUseCase.execute(targetMatchId, [player.id]);

            const targetMatch = await this.matchManager.GetMatch(targetMatchId);
            if (targetMatch) {
                const currentSourcePaths = targetMatch.sourcePaths ?? [];
                if (!currentSourcePaths.includes(match.id)) {
                    const dto = new UpdateMatchDto();
                    dto.sourcePaths = [...currentSourcePaths, match.id];
                    await this.matchManager.UpdateMatch(targetMatchId, dto);
                }
            }
        }
    }

    async advancePlayers(match: Match, sortedPlayers: Player[]): Promise<void> {
        if (!match.targetPaths?.length) return;

        const advanceCount = Math.min(match.targetPaths.length, sortedPlayers.length);
        for (let i = 0; i < advanceCount; i++) {
            const player = sortedPlayers[i];
            const targetMatchId = match.targetPaths[i];

            const dto = new UpdateMatchDto();
            dto.playerIds = [player.id];
            await this.matchManager.UpdateMatch(targetMatchId, dto);

            const targetMatch = await this.matchManager.GetMatch(targetMatchId);
            if (targetMatch?.sourcePaths) {
                const pathDto = new UpdateMatchDto();
                pathDto.sourcePaths = targetMatch.sourcePaths.filter(id => id !== match.id);
                await this.matchManager.UpdateMatch(targetMatchId, pathDto);
            }
        }
    }
}
