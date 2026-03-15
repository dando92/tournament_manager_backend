import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '@persistence/entities';
import { UpdatePlayerDto } from '../../dtos';

@Injectable()
export class UpdatePlayerUseCase {
    constructor(
        @InjectRepository(Player)
        private readonly playersRepo: Repository<Player>,
    ) {}

    async execute(id: number, dto: UpdatePlayerDto): Promise<Player> {
        const player = await this.playersRepo.findOneBy({ id });
        if (!player) throw new NotFoundException(`Player with id ${id} not found`);
        this.playersRepo.merge(player, dto);
        return await this.playersRepo.save(player);
    }
}
