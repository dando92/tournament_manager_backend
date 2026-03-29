import { Body, Controller, Delete, Get, Param, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { Division, Player } from '@persistence/entities';
import { CreateDivisionDto, UpdateDivisionDto } from '../dtos';
import { DivisionService } from '../services/division.service';

@Controller('divisions')
export class DivisionsController {
    constructor(private readonly divisionService: DivisionService) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateDivisionDto): Promise<Division> {
        return this.divisionService.create(dto);
    }

    @Get()
    async findAll(@Query('tournamentId') tournamentId?: string): Promise<Division[]> {
        return this.divisionService.findAll(tournamentId ? Number(tournamentId) : undefined);
    }

    @Get(':id')
    async findOne(@Param('id') id: number): Promise<Division> {
        return this.divisionService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateDivisionDto): Promise<Division> {
        return this.divisionService.update(id, dto);
    }

    @Delete(':id')
    async remove(@Param('id') id: number): Promise<void> {
        return this.divisionService.delete(id);
    }

    @Get(':id/players')
    async getPlayers(@Param('id') id: number): Promise<Player[]> {
        return this.divisionService.getPlayers(id);
    }
}
