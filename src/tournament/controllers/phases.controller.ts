import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { Phase } from '@persistence/entities';
import { CreatePhaseDto } from '../dtos';
import { CreatePhaseUseCase } from '../use-cases/phases/create-phase.use-case';

@Controller('phases')
export class PhasesController {
    constructor(private readonly createPhaseUseCase: CreatePhaseUseCase) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreatePhaseDto): Promise<Phase> {
        return this.createPhaseUseCase.execute(dto);
    }
}
