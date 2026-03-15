import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { CreateRoundDto, UpdateRoundDto } from '../dtos';
import { Round } from '@persistence/entities';
import { CreateRoundUseCase } from '../use-cases/rounds/create-round.use-case';
import { GetRoundsUseCase } from '../use-cases/rounds/get-rounds.use-case';
import { GetRoundUseCase } from '../use-cases/rounds/get-round.use-case';
import { UpdateRoundUseCase } from '../use-cases/rounds/update-round.use-case';
import { DeleteRoundUseCase } from '../use-cases/rounds/delete-round.use-case';

@Controller('rounds')
export class RoundsController {
    constructor(
        private readonly createRoundUseCase: CreateRoundUseCase,
        private readonly getRoundsUseCase: GetRoundsUseCase,
        private readonly getRoundUseCase: GetRoundUseCase,
        private readonly updateRoundUseCase: UpdateRoundUseCase,
        private readonly deleteRoundUseCase: DeleteRoundUseCase,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateRoundDto): Promise<Round> {
        return await this.createRoundUseCase.execute(dto);
    }

    @Get()
    async findAll(): Promise<Round[]> {
        return await this.getRoundsUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Round | null> {
        return this.getRoundUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateRoundDto): Promise<Round> {
        return this.updateRoundUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteRoundUseCase.execute(id);
    }
}
