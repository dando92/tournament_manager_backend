import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ScoringSystemProvider } from "@tournament/services/scoring-systems/ScoringSystemProvider";
import { BracketSystemProvider } from '../services/bracket-systems/BracketSystemProvider';
import { UpdateDivisionDto } from '../dtos';
import { GetDivisionUseCase } from '../use-cases/divisions/get-division.use-case';
import { UpdateDivisionUseCase } from '../use-cases/divisions/update-division.use-case';
import { GetTournamentUseCase } from '../use-cases/tournaments/get-tournament.use-case';

@Controller('match-operations')
export class MatchOperationsController {
    constructor(
        private readonly scoringSystemProvider: ScoringSystemProvider,
        private readonly bracketSystemProvider: BracketSystemProvider,
        private readonly getDivisionUseCase: GetDivisionUseCase,
        private readonly updateDivisionUseCase: UpdateDivisionUseCase,
        private readonly getTournamentUseCase: GetTournamentUseCase,
    ) {}

    @Get('scoring-systems')
    getScoringSystem(): string[] {
        return this.scoringSystemProvider.getAll();
    }

    @Get('bracket-types')
    getBracketTypes(): string[] {
        return this.bracketSystemProvider.getAll();
    }

    @Post('divisions/:divisionId/generate-bracket')
    async generateBracket(
        @Param('divisionId') divisionId: number,
        @Body() body: { bracketType: string; tournamentId: number; playerPerMatch?: number },
    ) {
        const division = await this.getDivisionUseCase.execute(Number(divisionId));
        const tournament = await this.getTournamentUseCase.execute(Number(body.tournamentId));
        const players = await tournament?.players ?? [];
        const playerPerMatch = body.playerPerMatch ?? 2;
        const system = this.bracketSystemProvider.getBracketSystem(body.bracketType);
        await system.generateForDivision(division, players, playerPerMatch);
        const updateDto = Object.assign(new UpdateDivisionDto(), { playersPerMatch: playerPerMatch });
        await this.updateDivisionUseCase.execute(Number(divisionId), updateDto);
        return { success: true };
    }
}
