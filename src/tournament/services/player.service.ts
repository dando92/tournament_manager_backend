import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player, Division } from '@persistence/entities';

@Injectable()
export class PlayerService {
    constructor(
        @InjectRepository(Player)
        private readonly playerRepo: Repository<Player>,
        @InjectRepository(Division)
        private readonly divisionRepo: Repository<Division>,
    ) {}

    async findByName(playerName: string): Promise<Player | null> {
        return this.playerRepo.findOneBy({ playerName });
    }

    async create(playerName: string): Promise<Player> {
        const player = new Player();
        player.playerName = playerName;
        return this.playerRepo.save(player);
    }

    async linkToDivision(playerId: number, divisionId: number): Promise<void> {
        const division = await this.divisionRepo.findOne({
            where: { id: divisionId },
            relations: ['players'],
        });
        if (!division) throw new NotFoundException(`Division ${divisionId} not found`);

        const alreadyLinked = division.players.some((p) => p.id === playerId);
        if (!alreadyLinked) {
            const player = new Player();
            player.id = playerId;
            division.players.push(player);
            await this.divisionRepo.save(division);
        }
    }

    async unlinkFromDivision(playerId: number, divisionId: number): Promise<void> {
        const division = await this.divisionRepo.findOne({
            where: { id: divisionId },
            relations: ['players'],
        });
        if (!division) throw new NotFoundException(`Division ${divisionId} not found`);

        division.players = division.players.filter((p) => p.id !== playerId);
        await this.divisionRepo.save(division);
    }
}
