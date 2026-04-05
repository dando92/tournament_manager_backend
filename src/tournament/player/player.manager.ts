import { Injectable, NotFoundException } from '@nestjs/common';
import { Player } from '@persistence/entities';
import { DivisionService } from '@tournament/services/division.service';
import { PlayerService } from '@player/player.service';

@Injectable()
export class PlayerManager {
    constructor(
        private readonly playerService: PlayerService,
        private readonly divisionService: DivisionService,
    ) {}

    async assignPlayerToDivision(playerId: number, divisionId: number): Promise<void> {
        const division = await this.divisionService.findPlayersOnly(divisionId);
        if (!division) throw new NotFoundException(`Division ${divisionId} not found`);

        const alreadyLinked = (division.players ?? []).some((player) => player.id === playerId);
        if (alreadyLinked) {
            return;
        }

        const player = new Player();
        player.id = playerId;

        await this.divisionService.updatePlayers(
            divisionId,
            [...(division.players ?? []), player],
            [...(division.seeding ?? []), playerId],
        );
    }

    async removePlayerFromDivision(playerId: number, divisionId: number): Promise<void> {
        const division = await this.divisionService.findPlayersOnly(divisionId);
        if (!division) throw new NotFoundException(`Division ${divisionId} not found`);

        await this.divisionService.updatePlayers(
            divisionId,
            (division.players ?? []).filter((player) => player.id !== playerId),
            (division.seeding ?? []).filter((seedId) => seedId !== playerId),
        );
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
