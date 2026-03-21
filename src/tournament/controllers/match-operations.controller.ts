import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { MatchManager } from '../services/match.manager';
import { StandingManager } from '../services/standing.manager';
import { ScoringSystemProvider } from "@tournament/services/scoring-systems/ScoringSystemProvider";
import { BracketSystemProvider } from '../services/bracket-systems/BracketSystemProvider';
import { CreateMatchDto, CreateScoreDto, UpdateRoundDto } from '../dtos';
import { GetMatchUseCase } from '../use-cases/matches/get-match.use-case';
import { CreateMatchUseCase } from '../use-cases/matches/create-match.use-case';
import { UpdateRoundUseCase } from '../use-cases/rounds/update-round.use-case';
import { GetDivisionUseCase } from '../use-cases/divisions/get-division.use-case';
import { GetTournamentUseCase } from '../use-cases/tournaments/get-tournament.use-case';

class CreateMatchBody {
    tournamentId: number;
    divisionId: number;
    matchName: string;
    group: string;
    subtitle: string;
    notes: string;
    levels: string;
    songIds: number[];
    scoringSystem: string;
    playerIds: number[];
}

class AddSongToMatchBody {
    tournamentId?: number;
    group?: string;
    level?: string;
    songId?: number;
    divisionId?: number;
}

class AddStandingBody {
    playerId: number;
    songId: number;
    percentage: number;
    score: number;
    isFailed: boolean;
}

class EditStandingBody {
    playerId: number;
    songId: number;
    percentage: number;
    score: number;
    isFailed: boolean;
}

@Controller('match-operations')
export class MatchOperationsController {
    constructor(
        private readonly matchManager: MatchManager,
        private readonly standingManager: StandingManager,
        private readonly createMatchUseCase: CreateMatchUseCase,
        private readonly getMatchUseCase: GetMatchUseCase,
        private readonly updateRoundUseCase: UpdateRoundUseCase,
        private readonly scoringSystemProvider: ScoringSystemProvider,
        private readonly bracketSystemProvider: BracketSystemProvider,
        private readonly getDivisionUseCase: GetDivisionUseCase,
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

    @Post('matches')
    async createMatch(@Body() dto: CreateMatchBody) {
        const newMatchDto = new CreateMatchDto();
        newMatchDto.name = dto.matchName;
        newMatchDto.notes = dto.notes;
        newMatchDto.divisionId = dto.divisionId;
        newMatchDto.playerIds = dto.playerIds;
        newMatchDto.subtitle = dto.subtitle;
        newMatchDto.scoringSystem = dto.scoringSystem;

        const match = await this.createMatchUseCase.execute(newMatchDto);

        if (dto.songIds) {
            await this.matchManager.AddSongsToMatch(match, dto.songIds);
        } else if (dto.levels) {
            await this.matchManager.AddRandomSongsToMatch(match, dto.tournamentId, dto.divisionId, dto.group, dto.levels);
        }

        return await this.getMatchUseCase.execute(match.id);
    }

    @Post('matches/:matchId/songs')
    async addSongToMatch(@Param('matchId') matchId: number, @Body() dto: AddSongToMatchBody) {
        const match = await this.getMatchUseCase.execute(matchId);

        if (dto.songId) {
            await this.matchManager.AddSongsToMatch(match, [dto.songId]);
        } else if (dto.level) {
            await this.matchManager.AddRandomSongsToMatch(match, dto.tournamentId, dto.divisionId, dto.group, dto.level);
        }

        return await this.getMatchUseCase.execute(matchId);
    }

    @Delete('matches/:matchId/songs/:songId')
    async removeSongFromMatch(@Param('matchId') matchId: number, @Param('songId') songId: number) {
        await this.matchManager.RemoveSongFromMatchById(matchId, songId);
        return await this.getMatchUseCase.execute(matchId);
    }

    @Put('matches/:matchId/songs/:songId')
    async editSongInMatch(@Param('matchId') matchId: number, @Param('songId') songId: number, @Body() dto: AddSongToMatchBody) {
        await this.matchManager.RemoveSongFromMatchById(matchId, songId);
        const match = await this.getMatchUseCase.execute(matchId);

        if (dto.songId) {
            await this.matchManager.AddSongsToMatch(match, [dto.songId]);
        } else if (dto.level) {
            await this.matchManager.AddRandomSongsToMatch(match, dto.tournamentId, dto.divisionId, dto.group, dto.level);
        }

        return await this.getMatchUseCase.execute(matchId);
    }

    @Post('matches/:matchId/standings')
    async addStanding(@Param('matchId') matchId: number, @Body() dto: AddStandingBody) {
        if (dto.isFailed && dto.percentage == -1) {
            const match = await this.getMatchUseCase.execute(matchId);
            const round = match.rounds.find(round => round.song.id == dto.songId);

            if (round.disabledPlayerIds == null) {
                round.disabledPlayerIds = [];
            }

            round.disabledPlayerIds.push(dto.playerId);

            const roundDto = new UpdateRoundDto();
            roundDto.disabledPlayerIds = round.disabledPlayerIds;
            await this.updateRoundUseCase.execute(round.id, roundDto);
        }

        const score = new CreateScoreDto();
        score.isFailed = dto.isFailed;
        score.percentage = dto.percentage;
        score.playerId = dto.playerId;
        score.songId = dto.songId;

        return await this.standingManager.AddScoreToMatchById(matchId, score);
    }

    @Delete('matches/:matchId/standings/:playerId/:songId')
    async deleteStanding(
        @Param('matchId') matchId: number,
        @Param('playerId') playerId: number,
        @Param('songId') songId: number,
    ) {
        return await this.standingManager.RemoveStandingFromMatch(matchId, playerId, songId);
    }

    @Put('matches/:matchId/standings')
    async editStanding(@Param('matchId') matchId: number, @Body() dto: EditStandingBody) {
        return await this.standingManager.EditStandingInMatch(matchId, dto.playerId, dto.songId, dto.percentage, dto.isFailed);
    }

    @Post('divisions/:divisionId/generate-bracket')
    async generateBracket(
        @Param('divisionId') divisionId: number,
        @Body() body: { bracketType: string; tournamentId: number; playerPerMatch?: number },
    ) {
        const division = await this.getDivisionUseCase.execute(Number(divisionId));
        const tournament = await this.getTournamentUseCase.execute(Number(body.tournamentId));
        const players = await tournament?.players ?? [];
        const system = this.bracketSystemProvider.getBracketSystem(body.bracketType);
        await system.generateForDivision(division, players, body.playerPerMatch ?? 2);
        return { success: true };
    }
}
