import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { Player } from '@persistence/entities';
import { JwtAuthGuard } from '@auth/guards';
import { PlayerService } from '@player/player.service';
import { PlayerManager } from '@player/player.manager';
import { CreatePlayerDto, UpdatePlayerDto, BulkAddPlayersToDivisionDto } from '@player/player.dto';

@Controller('players')
export class PlayersController {
    constructor(
        private readonly playerService: PlayerService,
        private readonly playerManager: PlayerManager,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreatePlayerDto): Promise<Player> {
        return this.playerService.create(dto.playerName);
    }

    @Get()
    async findAll(): Promise<Player[]> {
        return this.playerService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Player | null> {
        return this.playerService.findById(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdatePlayerDto): Promise<Player> {
        return this.playerService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.playerService.delete(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':playerId/divisions/:divisionId')
    async assignToDivision(
        @Param('playerId') playerId: number,
        @Param('divisionId') divisionId: number,
    ): Promise<void> {
        return this.playerManager.assignPlayerToDivision(playerId, divisionId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':playerId/divisions/:divisionId')
    async removeFromDivision(
        @Param('playerId') playerId: number,
        @Param('divisionId') divisionId: number,
    ): Promise<void> {
        return this.playerManager.removePlayerFromDivision(playerId, divisionId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('divisions/:divisionId/bulk')
    async bulkAddToDivision(
        @Param('divisionId') divisionId: number,
        @Body(new ValidationPipe()) dto: BulkAddPlayersToDivisionDto,
    ): Promise<{ players: Player[]; warnings: string[] }> {
        return this.playerManager.addPlayersToDivision(dto.playerNames, divisionId);
    }
}
