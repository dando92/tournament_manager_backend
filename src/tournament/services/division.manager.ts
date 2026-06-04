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
            entrants: (division.entrants ?? []).map((entrant) => ({
                id: entrant.id,
                name: entrant.name,
                type: entrant.type,
                seedNum: entrant.seedNum ?? null,
                status: entrant.status,
                participants: (entrant.participants ?? []).map((participant) => ({
                    id: participant.id,
                    roles: participant.roles ?? [],
                    status: participant.status,
                    player: {
                        id: participant.player.id,
                        playerName: participant.player.playerName,
                    },
                })),
            })),
            phases: (division.phases ?? []).map((phase) => ({
                id: phase.id,
                name: phase.name,
                matchCount: phase.matches?.length ?? 0,
                phaseGroups: (phase.phaseGroups ?? []).map((phaseGroup) => ({
                    id: phaseGroup.id,
                    name: phaseGroup.name,
                    displayIdentifier: phaseGroup.displayIdentifier ?? null,
                    bracketType: phaseGroup.bracketType ?? null,
                    state: phaseGroup.state,
                    matchCount: phaseGroup.matches?.length ?? 0,
                    entrants: (phaseGroup.entrants ?? []).map((phaseGroupEntrant) => ({
                        id: phaseGroupEntrant.id,
                        seedNum: phaseGroupEntrant.seedNum ?? null,
                        slot: phaseGroupEntrant.slot ?? null,
                        status: phaseGroupEntrant.status,
                        entrant: {
                            id: phaseGroupEntrant.entrant.id,
                            name: phaseGroupEntrant.entrant.name,
                            type: phaseGroupEntrant.entrant.type,
                            seedNum: phaseGroupEntrant.entrant.seedNum ?? null,
                            status: phaseGroupEntrant.entrant.status,
                            participants: (phaseGroupEntrant.entrant.participants ?? []).map((participant) => ({
                                id: participant.id,
                                roles: participant.roles ?? [],
                                status: participant.status,
                                player: {
                                    id: participant.player.id,
                                    playerName: participant.player.playerName,
                                },
                            })),
                        },
                    })),
                })),
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
