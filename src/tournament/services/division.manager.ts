import { Injectable, NotFoundException } from '@nestjs/common';
import { DivisionStandingRowDto, DivisionSummaryDto } from '../dtos';
import { DivisionService } from './division.service';

@Injectable()
export class DivisionManager {
    constructor(private readonly divisionService: DivisionService) {}

    private getPhaseMatches(phase: { phaseGroups?: Array<{ matches?: any[] }> }): any[] {
        return (phase.phaseGroups ?? []).flatMap((phaseGroup) => phaseGroup.matches ?? []);
    }

    private toPhaseGroupSummary(phase: { phaseGroups?: Array<{ id: number; name: string; mode: 'set-driven' | 'progression-driven'; matches?: any[] }> }) {
        return (phase.phaseGroups ?? []).map((phaseGroup) => ({
            id: phaseGroup.id,
            name: phaseGroup.name,
            mode: phaseGroup.mode,
            matchCount: phaseGroup.matches?.length ?? 0,
        }));
    }

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
                type: phase.type,
                matchCount: this.getPhaseMatches(phase).length,
                seeds: (phase.seeds ?? []).map((seed) => ({
                    id: seed.id,
                    entrantId: seed.entrant?.id,
                    seedNum: seed.seedNum,
                })),
                phaseGroups: this.toPhaseGroupSummary(phase),
            })),
        };
    }

    async findStandings(id: number): Promise<DivisionStandingRowDto[]> {
        const division = await this.divisionService.findOneForStandings(id);
        if (!division) throw new NotFoundException(`Division ${id} not found`);

        const playerTotals = new Map<number, DivisionStandingRowDto>();

        for (const phase of division.phases ?? []) {
            for (const match of this.getPhaseMatches(phase)) {
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
