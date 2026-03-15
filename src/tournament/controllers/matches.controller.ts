import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { CreateMatchDto, UpdateMatchDto } from '../dtos';
import { Match } from '@persistence/entities';
import { CreateMatchUseCase } from '../use-cases/matches/create-match.use-case';
import { GetMatchesUseCase } from '../use-cases/matches/get-matches.use-case';
import { GetMatchUseCase } from '../use-cases/matches/get-match.use-case';
import { UpdateMatchUseCase } from '../use-cases/matches/update-match.use-case';
import { DeleteMatchUseCase } from '../use-cases/matches/delete-match.use-case';

@Controller('matches')
export class MatchesController {
    constructor(
        private readonly createMatchUseCase: CreateMatchUseCase,
        private readonly getMatchesUseCase: GetMatchesUseCase,
        private readonly getMatchUseCase: GetMatchUseCase,
        private readonly updateMatchUseCase: UpdateMatchUseCase,
        private readonly deleteMatchUseCase: DeleteMatchUseCase,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateMatchDto): Promise<Match> {
        return await this.createMatchUseCase.execute(dto);
    }

    @Get()
    async findAll(): Promise<Match[]> {
        return await this.getMatchesUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Match | null> {
        return this.getMatchUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateMatchDto): Promise<Match> {
        return this.updateMatchUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteMatchUseCase.execute(id);
    }
}
