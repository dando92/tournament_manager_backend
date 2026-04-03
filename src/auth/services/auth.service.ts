import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { Account } from '@persistence/entities';


@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Account)
        private accountRepo: Repository<Account>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async validateUser(username: string, password: string) {
        const user = await this.accountRepo.findOneBy({ username: username.toLowerCase() });
        const isMatch = await bcrypt.compare(password, user?.password);
        if (!isMatch) {
            throw new UnauthorizedException();
        }
        return user;
    }

    async login(user: any) {
        const payload = {
            sub: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            isTournamentCreator: user.isTournamentCreator,
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }

    async loginWithApiKey(apiKey: string): Promise<{ access_token: string }> {
        const expectedKey = this.configService.get<string>('LOCAL_API_KEY');
        if (!expectedKey || apiKey !== expectedKey) {
            throw new UnauthorizedException('Invalid API key');
        }
        const payload = {
            sub: 'local-admin',
            username: 'admin',
            isAdmin: true,
            isTournamentCreator: true,
        };
        return {
            access_token: await this.jwtService.signAsync(payload, { expiresIn: '100y' }),
        };
    }

    async getMe(userId: string): Promise<Account | Partial<Account>> {
        if (userId === 'local-admin') {
            return {
                id: 'local-admin',
                username: 'admin',
                email: '',
                isAdmin: true,
                isTournamentCreator: true,
                player: null,
            } as Partial<Account>;
        }
        return this.accountRepo.findOne({
            where: { id: userId },
            relations: ['player'],
        });
    }
}
