import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { genSalt, hash } from 'bcrypt';
import { Repository } from "typeorm";

import { CreateUserPlayerDto } from './dtos';

import { Account, Player } from "@persistence/entities";


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
        const player = new Player();
        player.playerName = dto.playerName ?? dto.username;
        await this.playerRepo.save(player);

        const salt = await genSalt(10);
        const hashedPassword = await hash(dto.password, salt);

        const account = new Account();
        account.username = dto.username;
        account.email = dto.email;
        account.password = hashedPassword;
        account.grooveStatsApi = dto.grooveStatsApi ?? '';
        account.player = player;

        await this.accountRepo.save(account);

        return account;
    }
}
