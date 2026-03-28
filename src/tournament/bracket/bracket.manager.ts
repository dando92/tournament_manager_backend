import { Inject, Injectable } from "@nestjs/common";
import { BracketSystemProvider } from "@bracket/BracketSystemProvider";
import { MatchManager } from "@match/services/match.manager";
import { Match, Player } from "@persistence/entities";
import { UpdateDivisionDto } from "@tournament/dtos";
import { GetDivisionUseCase } from "@tournament/use-cases/divisions/get-division.use-case";
import { UpdateDivisionUseCase } from "@tournament/use-cases/divisions/update-division.use-case";

@Injectable()
export class BracketManager {
    constructor(
        @Inject()
        private readonly bracketSystemProvider: BracketSystemProvider,
        @Inject()
        private readonly matchManager: MatchManager,
        @Inject()
        private readonly getDivisionUseCase: GetDivisionUseCase,
        @Inject()
        private readonly updateDivisionUseCase: UpdateDivisionUseCase,
    ) {}

    getBracketTypes(): string[] {
        return this.bracketSystemProvider.getAll();
    }

    async generateForDivision(divisionId: number, bracketType: string, playerPerMatch: number): Promise<void> {
        const division = await this.getDivisionUseCase.execute(divisionId);
        const players = division?.players ?? [];
        const system = this.bracketSystemProvider.getBracketSystem(bracketType);
        await system.generateForDivision(division, players, playerPerMatch);
        const updateDto = Object.assign(new UpdateDivisionDto(), { playersPerMatch: playerPerMatch });
        await this.updateDivisionUseCase.execute(divisionId, updateDto);
    }

    async revertPlayers(match: Match, sortedPlayers: Player[]): Promise<void> {
        if (!match.targetPaths) 
            return;

        for (let i = 0; i < match.targetPaths.length; i++) {
            const targetMatchId = match.targetPaths[i];

            if (targetMatchId === 0) 
                continue;

            await this.matchManager.RemovePlayerInMatch(match.targetPaths[i], sortedPlayers[i].id);
        }
    }

    async advancePlayers(match: Match, sortedPlayers: Player[]): Promise<void> {
        if (!match.targetPaths) 
            return;

        for (let i = 0; i < match.targetPaths.length; i++) {
            const targetMatchId = match.targetPaths[i];

            if (targetMatchId === 0) 
                continue;

            await this.matchManager.AddPlayerInMatch(targetMatchId, sortedPlayers[i].id);
        }
    }
}
