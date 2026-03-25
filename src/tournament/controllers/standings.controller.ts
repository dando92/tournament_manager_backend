import { Body, Controller, Delete, Get, Param, Patch, Post, Put, ValidationPipe } from '@nestjs/common';
import { AddStandingToMatchDto, CreateScoreDto, CreateStandingDto, UpdateRoundDto, UpdateStandingDto } from '../dtos';
import { Match, Standing } from '@persistence/entities';
import { CreateStandingUseCase } from '../use-cases/standings/create-standing.use-case';
import { GetStandingsUseCase } from '../use-cases/standings/get-standings.use-case';
import { GetStandingUseCase } from '../use-cases/standings/get-standing.use-case';
import { UpdateStandingUseCase } from '../use-cases/standings/update-standing.use-case';
import { DeleteStandingUseCase } from '../use-cases/standings/delete-standing.use-case';
import { UpdateRoundUseCase } from '../use-cases/rounds/update-round.use-case';
import { StandingManager } from '../services/standing.manager';
import { MatchManager } from '../services/match.manager';

@Controller('standings')
export class StandingsController {
    constructor(
        private readonly createStandingUseCase: CreateStandingUseCase,
        private readonly getStandingsUseCase: GetStandingsUseCase,
        private readonly getStandingUseCase: GetStandingUseCase,
        private readonly updateStandingUseCase: UpdateStandingUseCase,
        private readonly deleteStandingUseCase: DeleteStandingUseCase,
        private readonly updateRoundUseCase: UpdateRoundUseCase,
        private readonly standingManager: StandingManager,
        private readonly matchManager: MatchManager,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateStandingDto): Promise<Standing> {
        return await this.createStandingUseCase.execute(dto);
    }

    @Get()
    async findAll(): Promise<Standing[]> {
        return await this.getStandingsUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Standing | null> {
        return this.getStandingUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateStandingDto): Promise<Standing> {
        return this.updateStandingUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteStandingUseCase.execute(id);
    }

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
