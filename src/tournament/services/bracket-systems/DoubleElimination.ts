import { IBracketSystem } from "./IBracketSystem";
import { Division, Match } from "@persistence/entities";

export class DoubleElimination extends IBracketSystem {
    getName(): string {
        return "DoubleElimination";
    }

    getDescription(): string {
        return "DoubleElimination";
    }

    protected async createBracket(orderedplayers: string[], playerPerMatch: number, division: Division) {
        if (playerPerMatch !== 2 && playerPerMatch !== 4 && playerPerMatch !== 8) {
            throw new Error(`DoubleElimination only supports playerPerMatch of 2, 4, or 8, got ${playerPerMatch}`);
        }

        const N = orderedplayers.length;
        const P = playerPerMatch;
        const passingPlayers = P / 2;

        const r1MatchCount = Math.max(2, this.nextPow2(Math.ceil(N / P)));
        const nextEffN = P * r1MatchCount;
        const byes = nextEffN - N;

        if (byes > 0) {
            console.log(`DoubleElimination: adding ${byes} bye(s) (effective bracket size: ${nextEffN})`);
        }

        const W = Math.log2(r1MatchCount) + 1;

        // --- Create Winners Bracket rounds ---
        const wbRounds: Match[][] = [];
        let wbMatchCount = r1MatchCount;
        for (let k = 0; k < W; k++) {
            const matches = await this.CreateMatchesInDivision(`WB_Round_${k + 1}`, division, wbMatchCount);
            wbRounds.push(matches);
            wbMatchCount = Math.floor(wbMatchCount / 2);
        }

        // --- Create Losers Bracket rounds ---
        const lbRounds: Match[][] = [];
        let lbMatchCount = Math.floor(r1MatchCount / 2);
        for (let i = 0; i < 2 * (W - 1); i++) {
            const isDropRound = i % 2 === 1;
            const roundNum = Math.floor(i / 2) + 1;
            const roundName = isDropRound ? `LB_Drop_${roundNum}` : `LB_Merge_${roundNum}`;
            const matches = await this.CreateMatchesInDivision(roundName, division, lbMatchCount);
            lbRounds.push(matches);
            if (isDropRound) {
                lbMatchCount = Math.floor(lbMatchCount / 2);
            }
        }

        // --- Create Grand Final ---
        const grandFinalMatches = await this.CreateMatchesInDivision('Grand_Final', division, 1);
        const grandFinalMatch = grandFinalMatches[0];

        // --- Wire Winners Bracket paths ---
        for (let k = 0; k < W; k++) {
            const round = wbRounds[k];
            for (let m = 0; m < round.length; m++) {
                const match = round[m];
                match.paths = [];

                const winnerDestId = k < W - 1
                    ? wbRounds[k + 1][Math.floor(m / 2)].id
                    : grandFinalMatch.id;

                const loserDestId = k === 0
                    ? lbRounds[0][Math.floor(m / 2)].id
                    : lbRounds[2 * k - 1][m].id;

                for (let p = 0; p < passingPlayers; p++) match.paths.push(winnerDestId);
                for (let p = 0; p < passingPlayers; p++) match.paths.push(loserDestId);

                await this.UpdateMatchPaths(match);
            }
        }

        // --- Wire Losers Bracket paths ---
        for (let i = 0; i < lbRounds.length; i++) {
            const round = lbRounds[i];
            const isLast = i === lbRounds.length - 1;

            for (let m = 0; m < round.length; m++) {
                const match = round[m];
                match.paths = [];

                let winnerDestId: number;
                if (isLast) {
                    winnerDestId = grandFinalMatch.id;
                } else if (i % 2 === 0) {
                    winnerDestId = lbRounds[i + 1][m].id;
                } else {
                    winnerDestId = lbRounds[i + 1][Math.floor(m / 2)].id;
                }

                for (let p = 0; p < passingPlayers; p++) match.paths.push(winnerDestId);

                await this.UpdateMatchPaths(match);
            }
        }
    }

    private nextPow2(x: number): number {
        let p = 1;
        while (p < x) p *= 2;
        return p;
    }
}
