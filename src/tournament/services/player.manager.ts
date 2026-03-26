import { Injectable } from '@nestjs/common';
import { Player } from '@persistence/entities';
import { PlayerService } from './player.service';

@Injectable()
export class PlayerManager {
    constructor(private readonly playerService: PlayerService) {}

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
            await this.playerService.linkToDivision(player.id, divisionId);
            players.push(player);
        }

        return { players, warnings };
    }
}
