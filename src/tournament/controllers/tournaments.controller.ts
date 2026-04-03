import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { Tournament } from '@persistence/entities';
import { CreateTournamentDto, UpdateTournamentDto } from '../dtos';
import { JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard, CreatorOrAdminGuard, TournamentAccessGuard, TournamentOwnershipGuard } from '@auth/guards';
import { TournamentService, MyTournamentRoles } from '../services/tournament.service';
import { TournamentManager } from '../services/tournament.manager';
import { LobbyManager } from '../services/lobby-manager.service';

@Controller('tournaments')
export class TournamentsController {
    constructor(
        private readonly tournamentService: TournamentService,
        private readonly tournamentManager: TournamentManager,
        private readonly lobbyManager: LobbyManager,
    ) {}

    @UseGuards(JwtAuthGuard, CreatorOrAdminGuard)
    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateTournamentDto, @Request() req): Promise<Tournament> {
        const tournament = await this.tournamentService.create(dto, req.user?.id);
        if (dto.syncstartUrl) {
            this.lobbyManager.OnTournamentCreated(tournament.id, dto.syncstartUrl);
        }
        return tournament;
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get()
    async findAll(@Request() req): Promise<Tournament[]> {
        return this.tournamentService.findAll(req.user?.id, req.user?.isAdmin);
    }

    @Get('public')
    async findAllPublic(): Promise<Tournament[]> {
        return this.tournamentService.findAllPublic();
    }

    @UseGuards(JwtAuthGuard)
    @Get('is-helper')
    async getIsHelper(@Request() req): Promise<{ isHelper: boolean }> {
        const isHelper = await this.tournamentService.isHelperOfAny(req.user.id);
        return { isHelper };
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-roles')
    async getMyRoles(@Request() req): Promise<MyTournamentRoles> {
        return this.tournamentService.getMyRoles(req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Tournament | null> {
        return this.tournamentService.findOne(Number(id));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Patch(':id')
    async update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateTournamentDto): Promise<Tournament> {
        const { tournament, previousSyncstartUrl } = await this.tournamentService.update(Number(id), dto);
        if (dto.syncstartUrl !== undefined && dto.syncstartUrl !== previousSyncstartUrl) {
            this.lobbyManager.OnTournamentUrlChanged(Number(id), dto.syncstartUrl);
        }
        return tournament;
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.tournamentService.delete(Number(id));
    }

    @UseGuards(JwtAuthGuard, TournamentOwnershipGuard)
    @Post(':id/helpers')
    async addHelper(
        @Param('id') id: number,
        @Body() body: { accountId: string },
    ): Promise<Tournament> {
        return this.tournamentManager.addHelper(Number(id), body.accountId);
    }

    @UseGuards(JwtAuthGuard, TournamentOwnershipGuard)
    @Delete(':id/helpers/:accountId')
    async removeHelper(
        @Param('id') id: number,
        @Param('accountId') accountId: string,
    ): Promise<Tournament> {
        return this.tournamentManager.removeHelper(Number(id), accountId);
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Get(':id/songs')
    async getSongs(@Param('id') id: number) {
        return (await this.tournamentService.findOne(id)).songs;
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/songs/:songId')
    async addSong(@Param('id') id: number, @Param('songId') songId: number) {
        await this.tournamentManager.addSong(Number(id), Number(songId));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Delete(':id/songs/:songId')
    async removeSong(@Param('id') id: number, @Param('songId') songId: number) {
        await this.tournamentManager.removeSong(Number(id), Number(songId));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Get(':id/lobbies')
    getLobbies(@Param('id') id: number) {
        return this.lobbyManager.GetLobbies(Number(id));
    }

    @Get(':id/lobbies/status')
    getLobbiesStatus(@Param('id') id: number) {
        return this.lobbyManager.GetLobbies(Number(id));
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Post(':id/lobbies/connect')
    async connectLobby(
        @Param('id') id: number,
        @Body() body: { name?: string; lobbyCode: string; password?: string },
    ) {
        const lobbyId = await this.lobbyManager.ConnectLobby(Number(id), body.name || body.lobbyCode, body.lobbyCode, body.password ?? '');
        return { id: lobbyId };
    }

    @UseGuards(JwtAuthGuard, TournamentAccessGuard)
    @Delete(':id/lobbies/:lobbyId/disconnect')
    disconnectLobby(@Param('id') id: number, @Param('lobbyId') lobbyId: string) {
        this.lobbyManager.DisconnectLobby(Number(id), lobbyId);
        return { ok: true };
    }
}
