import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { CreateMatchAssignmentDto, UpdateMatchAssignmentDto } from '@match/dtos/match_assignment.dto';
import { MatchAssignment } from '@persistence/entities';
import { CreateMatchAssignmentUseCase } from '@match/use-cases/match-assignments/create-match-assignment.use-case';
import { GetMatchAssignmentsUseCase } from '@match/use-cases/match-assignments/get-match-assignments.use-case';
import { GetMatchAssignmentUseCase } from '@match/use-cases/match-assignments/get-match-assignment.use-case';
import { UpdateMatchAssignmentUseCase } from '@match/use-cases/match-assignments/update-match-assignment.use-case';
import { DeleteMatchAssignmentUseCase } from '@match/use-cases/match-assignments/delete-match-assignment.use-case';

@Controller('matches')
export class MatchAssignmentController {
    constructor(
        private readonly createMatchAssignmentUseCase: CreateMatchAssignmentUseCase,
        private readonly getMatchAssignmentsUseCase: GetMatchAssignmentsUseCase,
        private readonly getMatchAssignmentUseCase: GetMatchAssignmentUseCase,
        private readonly updateMatchAssignmentUseCase: UpdateMatchAssignmentUseCase,
        private readonly deleteMatchAssignmentUseCase: DeleteMatchAssignmentUseCase,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateMatchAssignmentDto): Promise<MatchAssignment> {
        return await this.createMatchAssignmentUseCase.execute(dto);
    }

    @Get()
    async findAll(): Promise<MatchAssignment[]> {
        return await this.getMatchAssignmentsUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<MatchAssignment | null> {
        return this.getMatchAssignmentUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateMatchAssignmentDto): Promise<MatchAssignment> {
        return this.updateMatchAssignmentUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteMatchAssignmentUseCase.execute(id);
    }
}
