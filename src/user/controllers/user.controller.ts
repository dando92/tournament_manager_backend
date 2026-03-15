import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Request, UseGuards, ValidationPipe } from '@nestjs/common';

import { UserService } from '../services';
import { CreateUserPlayerDto } from '../dtos';

import { JwtAuthGuard, AdminGuard, CreatorOrAdminGuard } from '@auth/guards';

@Controller('user')
export class UserController {
    constructor(private readonly service: UserService) { }

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateUserPlayerDto) {
        return await this.service.create(dto);
    }

    @UseGuards(JwtAuthGuard, CreatorOrAdminGuard)
    @Get()
    async findAll() {
        return this.service.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/groove-stats')
    async updateGrooveStats(
        @Param('id') id: string,
        @Body() body: { grooveStatsApi: string },
        @Request() req,
    ) {
        if (req.user.id !== id) throw new ForbiddenException();
        return this.service.updateGrooveStatsApi(id, body.grooveStatsApi);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/profile')
    async updateProfile(
        @Param('id') id: string,
        @Body() body: { playerName?: string; nationality?: string; grooveStatsApi?: string; profilePicture?: string },
        @Request() req,
    ) {
        if (req.user.id !== id) throw new ForbiddenException();
        return this.service.updateProfile(id, body);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Patch(':id/flags')
    async updateFlags(
        @Param('id') id: string,
        @Body() body: { isAdmin?: boolean; isTournamentCreator?: boolean },
    ) {
        return this.service.updateFlags(id, body);
    }
}
