import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '@persistence/entities';

@Injectable()
export class DeletePlayerUseCase {
    constructor(
        @InjectRepository(Player)
        private readonly playersRepo: Repository<Player>,
    ) {}

    async execute(id: number): Promise<void> {
        await this.playersRepo.delete(id);
    }
}
