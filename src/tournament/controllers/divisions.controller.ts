import { Body, Controller, Delete, Get, Param, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { Division } from '@persistence/entities';
import { CreateDivisionDto, UpdateDivisionDto } from '../dtos';
import { CreateDivisionUseCase } from '../use-cases/divisions/create-division.use-case';
import { GetDivisionsUseCase } from '../use-cases/divisions/get-divisions.use-case';
import { GetDivisionUseCase } from '../use-cases/divisions/get-division.use-case';
import { UpdateDivisionUseCase } from '../use-cases/divisions/update-division.use-case';
import { DeleteDivisionUseCase } from '../use-cases/divisions/delete-division.use-case';

@Controller('divisions')
export class DivisionsController {
    constructor(
        private readonly createDivisionUseCase: CreateDivisionUseCase,
        private readonly getDivisionsUseCase: GetDivisionsUseCase,
        private readonly getDivisionUseCase: GetDivisionUseCase,
        private readonly updateDivisionUseCase: UpdateDivisionUseCase,
        private readonly deleteDivisionUseCase: DeleteDivisionUseCase,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateDivisionDto): Promise<Division> {
        return await this.createDivisionUseCase.execute(dto);
    }

    @Get()
    async findAll(@Query('tournamentId') tournamentId?: string): Promise<Division[]> {
        return this.getDivisionsUseCase.execute(tournamentId ? Number(tournamentId) : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Division | null> {
        return this.getDivisionUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateDivisionDto): Promise<Division> {
        return this.updateDivisionUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteDivisionUseCase.execute(id);
    }
}
