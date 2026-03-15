import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { CreateStandingDto, UpdateStandingDto } from '../dtos';
import { Standing } from '@persistence/entities';
import { CreateStandingUseCase } from '../use-cases/standings/create-standing.use-case';
import { GetStandingsUseCase } from '../use-cases/standings/get-standings.use-case';
import { GetStandingUseCase } from '../use-cases/standings/get-standing.use-case';
import { UpdateStandingUseCase } from '../use-cases/standings/update-standing.use-case';
import { DeleteStandingUseCase } from '../use-cases/standings/delete-standing.use-case';

@Controller('standings')
export class StandingsController {
    constructor(
        private readonly createStandingUseCase: CreateStandingUseCase,
        private readonly getStandingsUseCase: GetStandingsUseCase,
        private readonly getStandingUseCase: GetStandingUseCase,
        private readonly updateStandingUseCase: UpdateStandingUseCase,
        private readonly deleteStandingUseCase: DeleteStandingUseCase,
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
}
