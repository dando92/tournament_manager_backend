import { Body, Controller, Delete, Get, Param, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { Song } from '@persistence/entities';
import { CreateSongDto, UpdateSongDto } from '../dtos';
import { CreateSongUseCase } from '../use-cases/songs/create-song.use-case';
import { GetSongsUseCase } from '../use-cases/songs/get-songs.use-case';
import { GetSongUseCase } from '../use-cases/songs/get-song.use-case';
import { UpdateSongUseCase } from '../use-cases/songs/update-song.use-case';
import { DeleteSongUseCase } from '../use-cases/songs/delete-song.use-case';
import { GetScoresBySongUseCase } from '../use-cases/scores/get-scores-by-song.use-case';
import { GetTournamentUseCase } from '../use-cases/tournaments/get-tournament.use-case';

@Controller('songs')
export class SongsController {
    constructor(
        private readonly createSongUseCase: CreateSongUseCase,
        private readonly getSongsUseCase: GetSongsUseCase,
        private readonly getSongUseCase: GetSongUseCase,
        private readonly updateSongUseCase: UpdateSongUseCase,
        private readonly deleteSongUseCase: DeleteSongUseCase,
        private readonly getScoresBySongUseCase: GetScoresBySongUseCase,
        private readonly getTournamentUseCase: GetTournamentUseCase,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateSongDto): Promise<Song> {
        return await this.createSongUseCase.execute(dto);
    }

    @Get()
    async findAll(@Query('tournamentId') tournamentId?: number): Promise<Song[]> {
        if (tournamentId) {
            const tournament = await this.getTournamentUseCase.execute(Number(tournamentId));
            return await tournament.songs;
        }
        return await this.getSongsUseCase.execute();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Song | null> {
        return this.getSongUseCase.execute(id);
    }

    @Get(':id/scores')
    findScores(@Param('id') id: number) {
        return this.getScoresBySongUseCase.execute(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateSongDto): Promise<Song> {
        return this.updateSongUseCase.execute(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteSongUseCase.execute(id);
    }
}
