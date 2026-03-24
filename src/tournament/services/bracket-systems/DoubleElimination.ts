import { IBracketSystem } from "./IBracketSystem";
import { Division, Match, Phase, Player } from "@persistence/entities";

export class DoubleElimination extends IBracketSystem {
    getName(): string {
        return "DoubleElimination";
    }

    getDescription(): string {
        return "DoubleElimination";
    }

    protected async createBracket(players: Player[], playerPerMatch: number, _division: Division, phase: Phase): Promise<void> {
        if (playerPerMatch !== 2 && playerPerMatch !== 4 && playerPerMatch !== 8) {
            throw new Error(`DoubleElimination only supports playerPerMatch of 2, 4, or 8, got ${playerPerMatch}`);
        }

        const firstRound = await this.buildStructure(players.length, playerPerMatch, phase);
        await this.fillFirstWave(players, firstRound, playerPerMatch);
    }

    private async buildStructure(playerCount: number, playerPerMatch: number, phase: Phase): Promise<Match[]> {
        const passingPlayers = playerPerMatch / 2;
        const r1MatchCount = Math.max(2, this.nextPow2(Math.ceil(playerCount / playerPerMatch)));
        const nextEffN = playerPerMatch * r1MatchCount;
        const byes = nextEffN - playerCount;

        if (byes > 0) {
            console.log(`DoubleElimination: adding ${byes} bye(s) (effective bracket size: ${nextEffN})`);
        }

        const wbRoundCount = Math.log2(r1MatchCount) + 1;

        // --- Create Winners Bracket rounds ---
        const wbRounds: Match[][] = [];
        let wbMatchCount = r1MatchCount;
        for (let k = 0; k < wbRoundCount; k++) {
            const matches = await this.CreateMatchesInPhase(`WB_Round_${k + 1}`, phase, wbMatchCount);
            wbRounds.push(matches);
            wbMatchCount = Math.floor(wbMatchCount / 2);
        }

        // --- Create Losers Bracket rounds ---
        const lbRounds: Match[][] = [];
        let lbMatchCount = Math.floor(r1MatchCount / 2);
        for (let i = 0; i < 2 * (wbRoundCount - 1); i++) {
            const isDropRound = i % 2 === 1;
            const roundNum = Math.floor(i / 2) + 1;
            const roundName = isDropRound ? `LB_Drop_${roundNum}` : `LB_Merge_${roundNum}`;
            const matches = await this.CreateMatchesInPhase(roundName, phase, lbMatchCount);
            lbRounds.push(matches);
            if (isDropRound) {
                lbMatchCount = Math.floor(lbMatchCount / 2);
            }
        }

        // --- Create Grand Final ---
        const grandFinalMatches = await this.CreateMatchesInPhase('Grand_Final', phase, 1);
        const grandFinalMatch = grandFinalMatches[0];

        // --- Wire Winners Bracket paths (in memory) ---
        for (let k = 0; k < wbRoundCount; k++) {
            const round = wbRounds[k];
            for (let m = 0; m < round.length; m++) {
                const match = round[m];
                match.targetPaths = [];

                const winnerDest = k < wbRoundCount - 1
                    ? wbRounds[k + 1][Math.floor(m / 2)]
                    : grandFinalMatch;

                const loserDest = k === 0
                    ? lbRounds[0][Math.floor(m / 2)]
                    : lbRounds[2 * k - 1][m];

                for (let p = 0; p < passingPlayers; p++) match.targetPaths.push(winnerDest.id);
                for (let p = 0; p < passingPlayers; p++) match.targetPaths.push(loserDest.id);

                // Set sourcePaths on destinations
                if (!winnerDest.sourcePaths.includes(match.id)) winnerDest.sourcePaths.push(match.id);
                if (!loserDest.sourcePaths.includes(match.id)) loserDest.sourcePaths.push(match.id);
            }
        }

        // --- Wire Losers Bracket paths (in memory) ---
        for (let i = 0; i < lbRounds.length; i++) {
            const round = lbRounds[i];
            const isLast = i === lbRounds.length - 1;

            for (let m = 0; m < round.length; m++) {
                const match = round[m];
                match.targetPaths = [];

                let winnerDest: Match;
                if (isLast) {
                    winnerDest = grandFinalMatch;
                } else if (i % 2 === 0) {
                    winnerDest = lbRounds[i + 1][m];
                } else {
                    winnerDest = lbRounds[i + 1][Math.floor(m / 2)];
                }

                for (let p = 0; p < passingPlayers; p++) match.targetPaths.push(winnerDest.id);

                if (!winnerDest.sourcePaths.includes(match.id)) winnerDest.sourcePaths.push(match.id);
            }
        }

        // --- Save all matches ---
        for (const round of wbRounds) {
            for (const m of round) await this.UpdateMatchPaths(m);
        }
        for (const round of lbRounds) {
            for (const m of round) await this.UpdateMatchPaths(m);
        }
        await this.UpdateMatchPaths(grandFinalMatch);

        return wbRounds[0];
    }
}
