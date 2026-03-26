import { Body, Controller, Delete, Param, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { Player } from '@persistence/entities';
import { JwtAuthGuard } from '@auth/guards';
import { BulkAddPlayersToDivisionDto } from '../dtos';
import { PlayerManager } from '../services/player.manager';
import { PlayerService } from '../services/player.service';

@Controller('divisions')
export class DivisionPlayersController {
    constructor(
        private readonly playerManager: PlayerManager,
        private readonly playerService: PlayerService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post(':divisionId/players/bulk')
    async bulkAddPlayers(
        @Param('divisionId') divisionId: number,
        @Body(new ValidationPipe()) dto: BulkAddPlayersToDivisionDto,
    ): Promise<{ players: Player[]; warnings: string[] }> {
        return this.playerManager.addPlayersToDivision(dto.playerNames, divisionId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':divisionId/players/:playerId')
    async unlinkPlayer(
        @Param('divisionId') divisionId: number,
        @Param('playerId') playerId: number,
    ): Promise<void> {
        return this.playerService.unlinkFromDivision(playerId, divisionId);
    }
}
