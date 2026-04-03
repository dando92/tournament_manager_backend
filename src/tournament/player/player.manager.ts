import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player, Division } from '@persistence/entities';
import { PlayerService } from '@player/player.service';

@Injectable()
export class PlayerManager {
    constructor(
        private readonly playerService: PlayerService,
        @InjectRepository(Division)
        private readonly divisionRepo: Repository<Division>,
    ) {}

    async assignPlayerToDivision(playerId: number, divisionId: number): Promise<void> {
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
            division.seeding = [...(division.seeding ?? []), playerId];
            await this.divisionRepo.save(division);
        }
    }

    async removePlayerFromDivision(playerId: number, divisionId: number): Promise<void> {
        const division = await this.divisionRepo.findOne({
            where: { id: divisionId },
            relations: ['players'],
        });
        if (!division) throw new NotFoundException(`Division ${divisionId} not found`);

        division.players = division.players.filter((p) => p.id !== playerId);
        division.seeding = (division.seeding ?? []).filter((id) => id !== playerId);
        await this.divisionRepo.save(division);
    }

    async addPlayersToDivision(
        playerNames: string[],
        divisionId: number,
    ): Promise<{ players: Player[]; warnings: string[] }> {
        const normalized = [...new Set(playerNames.map((n) => n.trim().toLowerCase()).filter((n) => n.length > 0))];

        const players: Player[] = [];
        const warnings: string[] = [];

        for (const name of normalized) {
            let player = await this.playerService.findByName(name);
            if (player) {
                warnings.push(name);
            } else {
                player = await this.playerService.create(name);
            }
            await this.assignPlayerToDivision(player.id, divisionId);
            players.push(player);
        }

        return { players, warnings };
    }
}
