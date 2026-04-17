import { Body, Controller, Delete, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { Phase } from '@persistence/entities';
import { CreatePhaseDto, UpdatePhaseSeedingDto } from '../dtos';
import { PhaseService } from '../services/phase.service';

@Controller('phases')
export class PhasesController {
    constructor(private readonly phaseService: PhaseService) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreatePhaseDto): Promise<Phase> {
        return this.phaseService.create(dto);
    }

    @Delete(':id')
    async remove(@Param('id') id: number): Promise<void> {
        return this.phaseService.delete(id);
    }

    @Patch(':id/entrant-seeding')
    async updateSeeding(
        @Param('id') id: number,
        @Body(new ValidationPipe()) dto: UpdatePhaseSeedingDto,
    ): Promise<void> {
        return this.phaseService.updateSeeding(Number(id), dto.entrantIds);
    }
}
