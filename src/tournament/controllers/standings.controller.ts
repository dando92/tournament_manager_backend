import { Body, Controller, Delete, Param, Post, Put } from '@nestjs/common';
import { AddStandingToMatchDto, CreateScoreDto, UpdateRoundDto } from '../dtos';
import { Match } from '@persistence/entities';
import { UpdateRoundUseCase } from '../use-cases/rounds/update-round.use-case';
import { StandingManager } from '../services/standing.manager';
import { MatchManager } from '@match/services/match.manager';

@Controller('standings')
export class StandingsController {
    constructor(
        private readonly updateRoundUseCase: UpdateRoundUseCase,
        private readonly standingManager: StandingManager,
        private readonly matchManager: MatchManager,
    ) {}

    @Post('matches/:matchId')
    async addStanding(@Param('matchId') matchId: number, @Body() dto: AddStandingToMatchDto): Promise<Match> {
        if (dto.isFailed && dto.percentage == -1) {
            const match = await this.matchManager.GetMatch(matchId);
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

    @Delete('matches/:matchId/:playerId/:songId')
    async deleteStanding(
        @Param('matchId') matchId: number,
        @Param('playerId') playerId: number,
        @Param('songId') songId: number,
    ): Promise<Match> {
        return await this.standingManager.RemoveStandingFromMatch(matchId, playerId, songId);
    }

    @Put('matches/:matchId')
    async editStanding(@Param('matchId') matchId: number, @Body() dto: AddStandingToMatchDto): Promise<Match> {
        return await this.standingManager.EditStandingInMatch(matchId, dto.playerId, dto.songId, dto.percentage, dto.isFailed);
    }
}
