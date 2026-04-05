import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserService } from '../services';
import { CreateUserPlayerDto } from '../dtos';

import { JwtAuthGuard, AdminGuard, CreatorOrAdminGuard } from '@auth/guards';
import { Account } from '@persistence/entities';

type CurrentUserProfileDto = {
    id: string;
    username: string;
    nationality: string;
    grooveStatsApi: string;
    profilePicture: string;
    player: Account['player'] | null;
};

type AdminUserDto = {
    id: string;
    username: string;
    isAdmin: boolean;
    isTournamentCreator: boolean;
};

@Controller('user')
export class UserController {
    constructor(
        private readonly service: UserService,
        private readonly configService: ConfigService,
    ) { }

    private toCurrentUserProfileDto(account: Account): CurrentUserProfileDto {
        return {
            id: account.id,
            username: account.username,
            nationality: account.nationality,
            grooveStatsApi: account.grooveStatsApi,
            profilePicture: account.profilePicture,
            player: account.player ?? null,
        };
    }

    private toAdminUserDto(account: Account): AdminUserDto {
        return {
            id: account.id,
            username: account.username,
            isAdmin: account.isAdmin,
            isTournamentCreator: account.isTournamentCreator,
        };
    }

    @Post()
    async create(@Body(new ValidationPipe()) dto: CreateUserPlayerDto) {
        if (this.configService.get<string>('AUTH_MODE') === 'local') {
            throw new ForbiddenException('Registration is disabled in local mode');
        }
        const account = await this.service.create(dto);
        return this.toCurrentUserProfileDto(account);
    }

    @UseGuards(JwtAuthGuard, CreatorOrAdminGuard)
    @Get()
    async findAll() {
        const accounts = await this.service.findAll();
        return accounts.map((account) => this.toAdminUserDto(account));
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/profile')
    async updateProfile(
        @Param('id') id: string,
        @Body() body: { playerName?: string; nationality?: string; grooveStatsApi?: string; profilePicture?: string },
        @Request() req,
    ) {
        if (req.user.id !== id) throw new ForbiddenException();
        const account = await this.service.updateProfile(id, body);
        return this.toCurrentUserProfileDto(account);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Patch(':id/flags')
    async updateFlags(
        @Param('id') id: string,
        @Body() body: { isAdmin?: boolean; isTournamentCreator?: boolean },
    ) {
        const account = await this.service.updateFlags(id, body);
        return this.toAdminUserDto(account);
    }
}
