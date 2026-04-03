import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { Phase } from '@persistence/entities';
import { CreatePhaseDto } from '../dtos';
import { PhaseService } from '../services/phase.service';

@Controller('phases')
export class PhasesController {
    constructor(private readonly phaseService: PhaseService) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreatePhaseDto): Promise<Phase> {
        return this.phaseService.create(dto);
    }
}
