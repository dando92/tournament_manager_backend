import { Body, Controller, Delete, Get, Param, Patch, Post, Put, ValidationPipe } from '@nestjs/common';
import { AddSongToMatchDto, CreateMatchDto, CreateMatchWithSongsDto, UpdateMatchDto } from '../dtos';
import { Match } from '@persistence/entities';
import { MatchManager } from '../services/match.manager';
import { MatchService } from '../services/match.service';

@Controller('matches')
export class MatchesController {
    constructor(
        private readonly matchService: MatchService,
        private readonly matchManager: MatchManager,
    ) {}

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateMatchWithSongsDto): Promise<Match> {
        const createDto = new CreateMatchDto();
        createDto.name = dto.name;
        createDto.notes = dto.notes;
        createDto.phaseId = dto.phaseId;
        createDto.playerIds = dto.playerIds;
        createDto.subtitle = dto.subtitle;
        createDto.scoringSystem = dto.scoringSystem;

        const match = await this.matchService.create(createDto);

        if (dto.songIds) {
            await this.matchManager.AddSongsToMatch(match, dto.songIds);
        } else if (dto.levels) {
            await this.matchManager.AddRandomSongsToMatch(match, dto.tournamentId, dto.divisionId, dto.group, dto.levels);
        }

        return await this.matchService.getMatch(match.id);
    }

    @Get()
    async findAll(): Promise<Match[]> {
        return await this.matchService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: number): Promise<Match | null> {
        return this.matchService.getMatch(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateMatchDto): Promise<Match> {
        return this.matchService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        return this.matchService.delete(id);
    }

    @Post(':matchId/songs')
    async addSongToMatch(@Param('matchId') matchId: number, @Body(new ValidationPipe()) dto: AddSongToMatchDto): Promise<Match> {
        const match = await this.matchService.getMatch(matchId);

        if (dto.songId) {
            await this.matchManager.AddSongsToMatch(match, [dto.songId]);
        } else if (dto.level) {
            await this.matchManager.AddRandomSongsToMatch(match, dto.tournamentId, dto.divisionId, dto.group, dto.level);
        }

        return await this.matchService.getMatch(matchId);
    }

    @Delete(':matchId/songs/:songId')
    async removeSongFromMatch(@Param('matchId') matchId: number, @Param('songId') songId: number): Promise<Match> {
        await this.matchManager.RemoveSongFromMatchById(matchId, songId);
        return await this.matchService.getMatch(matchId);
    }

    @Put(':matchId/songs/:songId')
    async editSongInMatch(@Param('matchId') matchId: number, @Param('songId') songId: number, @Body(new ValidationPipe()) dto: AddSongToMatchDto): Promise<Match> {
        await this.matchManager.RemoveSongFromMatchById(matchId, songId);
        const match = await this.matchService.getMatch(matchId);

        if (dto.songId) {
            await this.matchManager.AddSongsToMatch(match, [dto.songId]);
        } else if (dto.level) {
            await this.matchManager.AddRandomSongsToMatch(match, dto.tournamentId, dto.divisionId, dto.group, dto.level);
        }

        return await this.matchService.getMatch(matchId);
    }

    @Put(':matchId/paths')
    async updateMatchPaths(@Param('matchId') matchId: number, @Body(new ValidationPipe()) dto: UpdateMatchDto): Promise<Match> {
        const match = await this.matchService.getMatch(Number(matchId));
        if (!match) throw new Error(`Match ${matchId} not found`);

        const oldSourcePaths = match.sourcePaths ?? [];
        const newSourcePaths = dto.sourcePaths ?? [];

        for (const oldSourceId of oldSourcePaths) {
            if (!newSourcePaths.includes(oldSourceId)) {
                const sourceMatch = await this.matchService.getMatch(oldSourceId);
                if (sourceMatch) {
                    const updateDto = new UpdateMatchDto();
                    updateDto.targetPaths = (sourceMatch.targetPaths ?? []).filter(id => id !== Number(matchId));
                    await this.matchService.update(oldSourceId, updateDto);
                }
            }
        }

        for (const newSourceId of newSourcePaths) {
            if (!oldSourcePaths.includes(newSourceId)) {
                const sourceMatch = await this.matchService.getMatch(newSourceId);
                if (sourceMatch) {
                    const updateDto = new UpdateMatchDto();
                    updateDto.targetPaths = [...(sourceMatch.targetPaths ?? []), Number(matchId)];
                    await this.matchService.update(newSourceId, updateDto);
                }
            }
        }

        const updateDto = new UpdateMatchDto();
        updateDto.sourcePaths = newSourcePaths;
        await this.matchService.update(Number(matchId), updateDto);

        return await this.matchService.getMatch(Number(matchId));
    }
}
