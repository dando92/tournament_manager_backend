import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { genSalt, hash } from 'bcrypt';
import { Repository } from "typeorm";

import { Player, Account } from '@persistence/entities';
import { CreateUserPlayerDto } from '../dtos';


export type account = Account;

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(Account)
        private accountRepo: Repository<Account>,
        @InjectRepository(Player)
        private playerRepo: Repository<Player>,
    ) { }

    async create(dto: CreateUserPlayerDto) {
        const normalizedUsername = dto.username.toLowerCase();
        const existing = await this.accountRepo.findOneBy({ username: normalizedUsername });
        if (existing) {
            throw new UnprocessableEntityException();
        }

        const player = new Player();
        player.playerName = dto.playerName ?? dto.username;
        await this.playerRepo.save(player);

        const salt = await genSalt(10);
        const hashedPassword = await hash(dto.password, salt);

        const account = new Account();
        account.username = normalizedUsername;
        account.email = dto.email;
        account.password = hashedPassword;
        account.grooveStatsApi = dto.grooveStatsApi ?? '';
        account.player = player;

        await this.accountRepo.save(account);

        return account;
    }

    async findAll(): Promise<Account[]> {
        return this.accountRepo.find({ relations: ['player'] });
    }

    async updateGrooveStatsApi(accountId: string, grooveStatsApi: string): Promise<Account> {
        const account = await this.accountRepo.findOneBy({ id: accountId });
        account.grooveStatsApi = grooveStatsApi;
        return this.accountRepo.save(account);
    }

    async updateProfile(accountId: string, profile: { playerName?: string; nationality?: string }): Promise<Account> {
        const account = await this.accountRepo.findOne({ where: { id: accountId }, relations: ['player'] });
        if (profile.nationality !== undefined) account.nationality = profile.nationality;
        if (profile.playerName !== undefined && account.player) {
            account.player.playerName = profile.playerName;
            await this.playerRepo.save(account.player);
        }
        return this.accountRepo.save(account);
    }

    async updateFlags(accountId: string, flags: { isAdmin?: boolean; isTournamentCreator?: boolean }): Promise<Account> {
        const account = await this.accountRepo.findOneBy({ id: accountId });
        if (flags.isAdmin !== undefined) account.isAdmin = flags.isAdmin;
        if (flags.isTournamentCreator !== undefined) account.isTournamentCreator = flags.isTournamentCreator;
        return this.accountRepo.save(account);
    }
}
