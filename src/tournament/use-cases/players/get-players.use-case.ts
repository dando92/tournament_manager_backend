import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '@persistence/entities';

@Injectable()
export class GetPlayersUseCase {
    constructor(
        @InjectRepository(Player)
        private readonly playersRepo: Repository<Player>,
    ) {}

    async execute(): Promise<Player[]> {
        return await this.playersRepo.find();
    }
}
