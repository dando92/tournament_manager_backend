import { Body, Controller, Delete, Get, Param, Post, Query, ValidationPipe } from '@nestjs/common';
import { Song } from '@persistence/entities';
import { CreateSongDto } from '../dtos';
import { CreateSongUseCase } from '../use-cases/songs/create-song.use-case';
import { DeleteSongUseCase } from '../use-cases/songs/delete-song.use-case';
import { GetScoresBySongUseCase } from '../use-cases/scores/get-scores-by-song.use-case';
import { TournamentService } from '../services/tournament.service';

@Controller('songs')
export class SongsController {
    constructor(
        private readonly createSongUseCase: CreateSongUseCase,
        private readonly deleteSongUseCase: DeleteSongUseCase,
        private readonly getScoresBySongUseCase: GetScoresBySongUseCase,
        private readonly tournamentService: TournamentService,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateSongDto): Promise<Song> {
        return await this.createSongUseCase.execute(dto);
    }

    @Get()
    async findAll(@Query('tournamentId') tournamentId: number): Promise<Song[]> {
        return this.tournamentService.findSongsByTournamentId(Number(tournamentId));
    }

    @Get(':id/scores')
    findScores(@Param('id') id: number) {
        return this.getScoresBySongUseCase.execute(id);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteSongUseCase.execute(id);
    }
}
