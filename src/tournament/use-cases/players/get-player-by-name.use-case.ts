import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '@persistence/entities';

@Injectable()
export class GetPlayerByNameUseCase {
    constructor(
        @InjectRepository(Player)
        private readonly playersRepo: Repository<Player>,
    ) {}

    async execute(playerName: string): Promise<Player | null> {
        return await this.playersRepo.findOneBy({ playerName });
    }
}
