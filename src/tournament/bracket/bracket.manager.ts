import { Inject, Injectable } from "@nestjs/common";
import { BracketSystemProvider } from "@bracket/BracketSystemProvider";
import { MatchManager } from "@match/services/match.manager";
import { Match, Player } from "@persistence/entities";
import { UpdateMatchDto, UpdateDivisionDto } from "@tournament/dtos";
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
        if (!match.targetPaths?.length) return;

        const revertCount = Math.min(match.targetPaths.length, sortedPlayers.length);
        for (let i = 0; i < revertCount; i++) {
            const player = sortedPlayers[i];
            const targetMatchId = match.targetPaths[i];

            await this.matchManager.RemovePlayersFromMatch(targetMatchId, [player.id]);

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
