import { Injectable } from '@nestjs/common';

export type ActiveMatchRef = {
    tournamentId: number;
    matchId: number;
    startedAt: string;
};

@Injectable()
export class ActiveMatchManager {
    private readonly activeByTournament = new Map<number, Map<number, ActiveMatchRef>>();
    private readonly activeByMatch = new Map<number, ActiveMatchRef>();

    activateMatch(tournamentId: number, matchId: number): ActiveMatchRef {
        const ref: ActiveMatchRef = {
            tournamentId,
            matchId,
            startedAt: new Date().toISOString(),
        };

        const tournamentMatches = this.activeByTournament.get(tournamentId) ?? new Map<number, ActiveMatchRef>();
        tournamentMatches.set(matchId, ref);
        this.activeByTournament.set(tournamentId, tournamentMatches);
        this.activeByMatch.set(matchId, ref);

        return ref;
    }

    deactivateMatch(tournamentId: number, matchId: number): void {
        const tournamentMatches = this.activeByTournament.get(tournamentId);
        tournamentMatches?.delete(matchId);
        if (tournamentMatches?.size === 0) {
            this.activeByTournament.delete(tournamentId);
        }

        const active = this.activeByMatch.get(matchId);
        if (active?.tournamentId === tournamentId) {
            this.activeByMatch.delete(matchId);
        }
    }

    deactivateMatchById(matchId: number): void {
        const active = this.activeByMatch.get(matchId);
        if (!active) return;
        this.deactivateMatch(active.tournamentId, matchId);
    }

    getActiveMatches(tournamentId: number): ActiveMatchRef[] {
        return [...(this.activeByTournament.get(tournamentId)?.values() ?? [])];
    }

    getActiveMatchIds(tournamentId: number): number[] {
        return this.getActiveMatches(tournamentId).map((match) => match.matchId);
    }

    isMatchActive(matchId: number): boolean {
        return this.activeByMatch.has(matchId);
    }

    getMatchRef(matchId: number): ActiveMatchRef | null {
        return this.activeByMatch.get(matchId) ?? null;
    }
}
