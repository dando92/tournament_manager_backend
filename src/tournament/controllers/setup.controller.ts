import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { Setup } from '@persistence/entities';
import { CreateSetupDto, UpdateSetupDto } from '../dtos';
import { CreateSetupUseCase } from '../use-cases/setups/create-setup.use-case';
import { GetSetupsUseCase } from '../use-cases/setups/get-setups.use-case';
import { GetSetupUseCase } from '../use-cases/setups/get-setup.use-case';
import { UpdateSetupUseCase } from '../use-cases/setups/update-setup.use-case';
import { DeleteSetupUseCase } from '../use-cases/setups/delete-setup.use-case';

@Controller('divisions')
export class SetupController {
    constructor(
        private readonly createSetupUseCase: CreateSetupUseCase,
        private readonly getSetupsUseCase: GetSetupsUseCase,
        private readonly getSetupUseCase: GetSetupUseCase,
        private readonly updateSetupUseCase: UpdateSetupUseCase,
        private readonly deleteSetupUseCase: DeleteSetupUseCase,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateSetupDto): Promise<Setup> {
        return await this.createSetupUseCase.execute(dto);
    }

    @Get()
    async findAll(): Promise<Setup[]> {
        return await this.getSetupsUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Setup | null> {
        return this.getSetupUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateSetupDto): Promise<Setup> {
        return this.updateSetupUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteSetupUseCase.execute(id);
    }
}
