import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { CreateScoreDto, UpdateScoreDto } from '../dtos';
import { Score } from '@persistence/entities';
import { CreateScoreUseCase } from '../use-cases/scores/create-score.use-case';
import { GetScoresUseCase } from '../use-cases/scores/get-scores.use-case';
import { GetScoreUseCase } from '../use-cases/scores/get-score.use-case';
import { UpdateScoreUseCase } from '../use-cases/scores/update-score.use-case';
import { DeleteScoreUseCase } from '../use-cases/scores/delete-score.use-case';

@Controller('scores')
export class ScoresController {
    constructor(
        private readonly createScoreUseCase: CreateScoreUseCase,
        private readonly getScoresUseCase: GetScoresUseCase,
        private readonly getScoreUseCase: GetScoreUseCase,
        private readonly updateScoreUseCase: UpdateScoreUseCase,
        private readonly deleteScoreUseCase: DeleteScoreUseCase,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateScoreDto): Promise<Score> {
        return await this.createScoreUseCase.execute(dto);
    }

    @Get()
    async findAll(): Promise<Score[]> {
        return await this.getScoresUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Score | null> {
        return this.getScoreUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateScoreDto): Promise<Score> {
        return this.updateScoreUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteScoreUseCase.execute(id);
    }
}
