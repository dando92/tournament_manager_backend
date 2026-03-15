import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { Phase } from '@persistence/entities';
import { CreatePhaseDto, UpdatePhaseDto } from '../dtos';
import { CreatePhaseUseCase } from '../use-cases/phases/create-phase.use-case';
import { GetPhasesUseCase } from '../use-cases/phases/get-phases.use-case';
import { GetPhaseUseCase } from '../use-cases/phases/get-phase.use-case';
import { UpdatePhaseUseCase } from '../use-cases/phases/update-phase.use-case';
import { DeletePhaseUseCase } from '../use-cases/phases/delete-phase.use-case';

@Controller('phases')
export class PhasesController {
    constructor(
        private readonly createPhaseUseCase: CreatePhaseUseCase,
        private readonly getPhasesUseCase: GetPhasesUseCase,
        private readonly getPhaseUseCase: GetPhaseUseCase,
        private readonly updatePhaseUseCase: UpdatePhaseUseCase,
        private readonly deletePhaseUseCase: DeletePhaseUseCase,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreatePhaseDto): Promise<Phase> {
        return await this.createPhaseUseCase.execute(dto);
    }

    @Get()
    async findAll(): Promise<Phase[]> {
        return await this.getPhasesUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Phase | null> {
        return this.getPhaseUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdatePhaseDto): Promise<Phase> {
        return this.updatePhaseUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deletePhaseUseCase.execute(id);
    }
}
