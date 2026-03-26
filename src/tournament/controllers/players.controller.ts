import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { CreatePlayerDto, UpdatePlayerDto } from '../dtos';
import { Player } from '@persistence/entities';
import { CreatePlayerUseCase } from '../use-cases/players/create-player.use-case';
import { GetPlayersUseCase } from '../use-cases/players/get-players.use-case';
import { GetPlayerUseCase } from '../use-cases/players/get-player.use-case';
import { UpdatePlayerUseCase } from '../use-cases/players/update-player.use-case';
import { DeletePlayerUseCase } from '../use-cases/players/delete-player.use-case';
import { PlayerService } from '../services/player.service';

@Controller('players')
export class PlayersController {
    constructor(
        private readonly createPlayerUseCase: CreatePlayerUseCase,
        private readonly getPlayersUseCase: GetPlayersUseCase,
        private readonly getPlayerUseCase: GetPlayerUseCase,
        private readonly updatePlayerUseCase: UpdatePlayerUseCase,
        private readonly deletePlayerUseCase: DeletePlayerUseCase,
        private readonly playerService: PlayerService,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreatePlayerDto): Promise<Player> {
        const player = await this.createPlayerUseCase.execute(dto);
        if (dto.divisionId) {
            await this.playerService.linkToDivision(player.id, dto.divisionId);
        }
        return player;
    }

    @Get()
    async findAll(): Promise<Player[]> {
        return await this.getPlayersUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Player | null> {
        return this.getPlayerUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdatePlayerDto): Promise<Player> {
        return this.updatePlayerUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deletePlayerUseCase.execute(id);
    }
}
