import {
    Body,
    Controller,
    ValidationPipe,
    Post,
    Get,
    Request,
    UseGuards } from '@nestjs/common';

import { AuthService } from '../services';
import { AuthRefreshTokenDto, LocalApiKeyLoginDto } from '../dtos';
import { UserService } from '@user/services';
import { CreateUserPlayerDto } from '@user/dtos';
import { LocalAuthGuard, JwtAuthGuard, AdminGuard } from '@auth/guards';


@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService) { }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req) {
        return this.authService.login(req.user);
    }

    @Post('login/local')
    async loginLocal(@Body(new ValidationPipe()) dto: LocalApiKeyLoginDto) {
        return this.authService.loginWithApiKey(dto.apiKey);
    }

    @UseGuards(LocalAuthGuard)
    @Post('logout')
    async logout(@Request() req) {
        return req.logout();
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post()
    async create(@Body() createUserPlayerDto: CreateUserPlayerDto) {
        this.userService.create(createUserPlayerDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req) {
        return this.authService.getMe(req.user.id);
    }

    @Get('refresh')
    async getRefreshToken(@Body(new ValidationPipe()) refreshToken: AuthRefreshTokenDto) {
        return await this.authService.getRefreshToken(refreshToken);
    }
}
