import { Injectable, NotFoundException } from '@nestjs/common';
import { DivisionStandingRowDto, DivisionSummaryDto } from '../dtos';
import { DivisionService } from './division.service';

@Injectable()
export class DivisionManager {
    constructor(private readonly divisionService: DivisionService) {}

    async findSummary(id: number): Promise<DivisionSummaryDto> {
        const division = await this.divisionService.findOneForSummary(id);
        if (!division) throw new NotFoundException(`Division ${id} not found`);

        return {
            id: division.id,
            name: division.name,
            playersPerMatch: division.playersPerMatch ?? null,
            seeding: division.seeding ?? null,
            players: (division.players ?? []).map((player) => ({
                id: player.id,
                playerName: player.playerName,
            })),
            phases: (division.phases ?? []).map((phase) => ({
                id: phase.id,
                name: phase.name,
                matchCount: phase.matches?.length ?? 0,
            })),
        };
    }

    async findStandings(id: number): Promise<DivisionStandingRowDto[]> {
        const division = await this.divisionService.findOneForStandings(id);
        if (!division) throw new NotFoundException(`Division ${id} not found`);

        const playerTotals = new Map<number, DivisionStandingRowDto>();

        for (const phase of division.phases ?? []) {
            for (const match of phase.matches ?? []) {
                for (const round of match.rounds ?? []) {
                    for (const standing of round.standings ?? []) {
                        const player = standing.score.player;
                        const current = playerTotals.get(player.id) ?? {
                            id: player.id,
                            playerName: player.playerName,
                            points: 0,
                            songsPlayed: 0,
                        };

                        current.points += standing.points ?? 0;
                        current.songsPlayed += 1;
                        playerTotals.set(player.id, current);
                    }
                }
            }
        }

        return Array.from(playerTotals.values()).sort((a, b) =>
            b.points - a.points || b.songsPlayed - a.songsPlayed || a.playerName.localeCompare(b.playerName),
        );
    }
}
