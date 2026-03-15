import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { Tournament } from '@persistence/entities';
import { CreateTournamentDto, UpdateTournamentDto } from '../dtos';
import { JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard, CreatorOrAdminGuard, TournamentAccessGuard, TournamentOwnershipGuard } from '@auth/guards';
import { ItgOnlineProxyService } from '../services/itg-online-proxy.service';
import { CreateTournamentUseCase } from '../use-cases/tournaments/create-tournament.use-case';
import { GetTournamentsUseCase } from '../use-cases/tournaments/get-tournaments.use-case';
import { GetPublicTournamentsUseCase } from '../use-cases/tournaments/get-public-tournaments.use-case';
import { GetTournamentUseCase } from '../use-cases/tournaments/get-tournament.use-case';
import { UpdateTournamentUseCase } from '../use-cases/tournaments/update-tournament.use-case';
import { DeleteTournamentUseCase } from '../use-cases/tournaments/delete-tournament.use-case';
import { AssignTournamentHelperUseCase } from '../use-cases/tournaments/assign-tournament-helper.use-case';
import { RemoveTournamentHelperUseCase } from '../use-cases/tournaments/remove-tournament-helper.use-case';
import { GetTournamentPlayersUseCase } from '../use-cases/tournaments/get-tournament-players.use-case';
import { AddPlayerToTournamentUseCase } from '../use-cases/tournaments/add-player-to-tournament.use-case';
import { RemovePlayerFromTournamentUseCase } from '../use-cases/tournaments/remove-player-from-tournament.use-case';
import { GetTournamentSongsUseCase } from '../use-cases/tournaments/get-tournament-songs.use-case';
import { AddSongToTournamentUseCase } from '../use-cases/tournaments/add-song-to-tournament.use-case';
import { RemoveSongFromTournamentUseCase } from '../use-cases/tournaments/remove-song-from-tournament.use-case';
import { GetPlayerTournamentsUseCase } from '../use-cases/tournaments/get-player-tournaments.use-case';
import { IsHelperOfAnyUseCase } from '../use-cases/tournaments/is-helper-of-any.use-case';

@Controller('tournaments')
export class TournamentsController {
    constructor(
        private readonly createTournamentUseCase: CreateTournamentUseCase,
        private readonly getTournamentsUseCase: GetTournamentsUseCase,
        private readonly getPublicTournamentsUseCase: GetPublicTournamentsUseCase,
        private readonly getTournamentUseCase: GetTournamentUseCase,
        private readonly updateTournamentUseCase: UpdateTournamentUseCase,
        private readonly deleteTournamentUseCase: DeleteTournamentUseCase,
        private readonly assignTournamentHelperUseCase: AssignTournamentHelperUseCase,
        private readonly removeTournamentHelperUseCase: RemoveTournamentHelperUseCase,
        private readonly getTournamentPlayersUseCase: GetTournamentPlayersUseCase,
        private readonly addPlayerToTournamentUseCase: AddPlayerToTournamentUseCase,
        private readonly removePlayerFromTournamentUseCase: RemovePlayerFromTournamentUseCase,
        private readonly getTournamentSongsUseCase: GetTournamentSongsUseCase,
        private readonly addSongToTournamentUseCase: AddSongToTournamentUseCase,
        private readonly removeSongFromTournamentUseCase: RemoveSongFromTournamentUseCase,
        private readonly getPlayerTournamentsUseCase: GetPlayerTournamentsUseCase,
        private readonly isHelperOfAnyUseCase: IsHelperOfAnyUseCase,
        private readonly itgOnlineProxyService: ItgOnlineProxyService,
    ) {}

    @UseGuards(JwtAuthGuard, CreatorOrAdminGuard)
    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateTournamentDto, @Request() req): Promise<Tournament> {
        return await this.createTournamentUseCase.execute(dto, req.user?.id);
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get()
    async findAll(@Request() req): Promise<Tournament[]> {
        return await this.getTournamentsUseCase.execute(req.user?.id, req.user?.isAdmin, req.user?.isTournamentCreator);
    }

    @Get('public')
    async findAllPublic(): Promise<Tournament[]> {
        return this.getPublicTournamentsUseCase.execute();
    }

    @UseGuards(JwtAuthGuard)
    @Get('player-registrations')
    async getPlayerRegistrations(@Request() req): Promise<number[]> {
        return this.getPlayerTournamentsUseCase.execute(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('is-helper')
    async getIsHelper(@Request() req): Promise<{ isHelper: boolean }> {
        const isHelper = await this.isHelperOfAnyUseCase.execute(req.user.id);
        return { isHelper };
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Tournament | null> {
        return this.getTournamentUseCase.execute(id);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateTournamentDto): Promise<Tournament> {
        return this.updateTournamentUseCase.execute(id, dto);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.deleteTournamentUseCase.execute(id);
    }

    @UseGuards(JwtAuthGuard, TournamentOwnershipGuard)
    @Post(':id/helpers')
    async addHelper(
        @Param('id') id: number,
        @Body() body: { accountId: string },
    ): Promise<Tournament> {
        return this.assignTournamentHelperUseCase.execute(id, body.accountId);
    }

    @UseGuards(JwtAuthGuard, TournamentOwnershipGuard)
    @Delete(':id/helpers/:accountId')
    async removeHelper(
        @Param('id') id: number,
        @Param('accountId') accountId: string,
    ): Promise<Tournament> {
        return this.removeTournamentHelperUseCase.execute(id, accountId);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Get(':id/players')
    async getPlayers(@Param('id') id: number) {
        return this.getTournamentPlayersUseCase.execute(id);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/players')
    async addPlayer(
        @Param('id') id: number,
        @Body() body: { playerId: number },
    ) {
        await this.addPlayerToTournamentUseCase.execute(id, body.playerId);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Delete(':id/players/:playerId')
    async removePlayer(
        @Param('id') id: number,
        @Param('playerId') playerId: number,
    ) {
        await this.removePlayerFromTournamentUseCase.execute(id, Number(playerId));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Get(':id/songs')
    async getSongs(@Param('id') id: number) {
        return this.getTournamentSongsUseCase.execute(id);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/songs/:songId')
    async addSong(
        @Param('id') id: number,
        @Param('songId') songId: number,
    ) {
        await this.addSongToTournamentUseCase.execute(id, Number(songId));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Delete(':id/songs/:songId')
    async removeSong(
        @Param('id') id: number,
        @Param('songId') songId: number,
    ) {
        await this.removeSongFromTournamentUseCase.execute(id, Number(songId));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/lobby/connect')
    async connectLobby(
        @Param('id') id: number,
        @Body() body: { password?: string },
    ) {
        const tournament = await this.getTournamentUseCase.execute(Number(id));
        if (!tournament?.lobbyCode) throw new BadRequestException('No lobby code set for this tournament');
        await this.itgOnlineProxyService.Connect(Number(id), tournament.lobbyCode, body.password ?? '');
        return { connected: true };
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Delete(':id/lobby/disconnect')
    disconnectLobby(@Param('id') id: number) {
        this.itgOnlineProxyService.Disconnect(Number(id));
        return { connected: false };
    }

    @Get(':id/lobby/status')
    getLobbyStatus(@Param('id') id: number) {
        return { connected: this.itgOnlineProxyService.IsConnected(Number(id)) };
    }
}
