import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '@persistence/entities';
import { CreatePlayerDto } from '../../dtos';

@Injectable()
export class CreatePlayerUseCase {
    constructor(
        @InjectRepository(Player)
        private readonly playersRepo: Repository<Player>,
    ) {}

    async execute(dto: CreatePlayerDto): Promise<Player> {
        const player = new Player();
        player.playerName = dto.playerName;
        await this.playersRepo.save(player);
        return player;
    }
}
