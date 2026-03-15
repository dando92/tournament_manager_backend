import { IBracketSystem } from "./IBracketSystem";
import { Division, Phase } from "@persistence/entities";

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
        // Top half of each match advances in WB; bottom half drops to LB.
        const passingPlayers = P / 2;

        // Effective player count: smallest (P * power-of-2) >= N, minimum 2*P so LB always exists.
        const r1MatchCount = Math.max(2, this.nextPow2(Math.ceil(N / P)));
        const nextEffN = P * r1MatchCount;
        const byes = nextEffN - N;

        if (byes > 0) {
            console.log(`DoubleElimination: adding ${byes} bye(s) (effective bracket size: ${nextEffN})`);
        }

        // W = number of WB rounds. log2(r1MatchCount) gives rounds after R1.
        const W = Math.log2(r1MatchCount) + 1;

        // --- Create Winners Bracket phases ---
        // WB_Round_1: r1MatchCount matches, halving each round down to 1 (WB Finals).
        const wbPhases: Phase[] = [];
        let wbMatchCount = r1MatchCount;
        for (let k = 0; k < W; k++) {
            const phase = await this.CreatePhaseWithMatches(`WB_Round_${k + 1}`, division, wbMatchCount);
            wbPhases.push(phase);
            wbMatchCount = Math.floor(wbMatchCount / 2);
        }

        // --- Create Losers Bracket phases ---
        // 2*(W-1) phases total, alternating merge (even index) and drop (odd index) rounds.
        //   Merge rounds: LB survivors pair up internally — same count as subsequent drop round.
        //   Drop rounds:  LB merge winners face incoming WB losers — same count as preceding merge.
        // Match counts per pair of LB rounds: r1MatchCount/2, r1MatchCount/4, ..., 1.
        const lbPhases: Phase[] = [];
        let lbMatchCount = Math.floor(r1MatchCount / 2);
        for (let i = 0; i < 2 * (W - 1); i++) {
            const isDropRound = i % 2 === 1;
            const roundNum = Math.floor(i / 2) + 1;
            const phaseName = isDropRound ? `LB_Drop_${roundNum}` : `LB_Merge_${roundNum}`;
            const phase = await this.CreatePhaseWithMatches(phaseName, division, lbMatchCount);
            lbPhases.push(phase);
            // After each drop round the count halves for the next merge round.
            if (isDropRound) {
                lbMatchCount = Math.floor(lbMatchCount / 2);
            }
        }

        // --- Create Grand Final ---
        // GF receives passingPlayers winners from WB Finals + passingPlayers from LB Finals = P players.
        const grandFinalPhase = await this.CreatePhaseWithMatches('Grand_Final', division, 1);
        const grandFinalMatch = grandFinalPhase.matches[0];

        // --- Wire Winners Bracket paths ---
        // For WB round k (0-indexed), match m:
        //   paths[0..passingPlayers-1]          → next WB match (or GF from WB Finals)
        //   paths[passingPlayers..P-1]           → LB drop-in match
        //     WB R1 losers  → LB_Merge_1  (2 WB matches share 1 LB match: floor(m/2))
        //     WB Rk+1 losers → LB_Drop_k   (1-to-1: same index m)
        for (let k = 0; k < W; k++) {
            const phase = wbPhases[k];
            for (let m = 0; m < phase.matches.length; m++) {
                const match = phase.matches[m];
                match.paths = [];

                const winnerDestId = k < W - 1
                    ? wbPhases[k + 1].matches[Math.floor(m / 2)].id
                    : grandFinalMatch.id;

                const loserDestId = k === 0
                    ? lbPhases[0].matches[Math.floor(m / 2)].id   // WB R1 → LB Merge 1
                    : lbPhases[2 * k - 1].matches[m].id;          // WB Rk+1 → LB Drop k

                for (let p = 0; p < passingPlayers; p++) match.paths.push(winnerDestId);
                for (let p = 0; p < passingPlayers; p++) match.paths.push(loserDestId);

                await this.UpdateMatchPaths(match);
            }
        }

        // --- Wire Losers Bracket paths ---
        // For LB round i (0-indexed), match m:
        //   paths[0..passingPlayers-1] → next LB match (or GF from LB Finals)
        //   Losers are eliminated — no further paths.
        //   Merge round (even i): next is drop round at same index m (equal match counts).
        //   Drop round  (odd i):  next is merge round at floor(m/2) (count halves).
        for (let i = 0; i < lbPhases.length; i++) {
            const phase = lbPhases[i];
            const isLast = i === lbPhases.length - 1;

            for (let m = 0; m < phase.matches.length; m++) {
                const match = phase.matches[m];
                match.paths = [];

                let winnerDestId: number;
                if (isLast) {
                    winnerDestId = grandFinalMatch.id;
                } else if (i % 2 === 0) {
                    // Merge round → drop round (same count, same index m)
                    winnerDestId = lbPhases[i + 1].matches[m].id;
                } else {
                    // Drop round → merge round (count halves, index floor(m/2))
                    winnerDestId = lbPhases[i + 1].matches[Math.floor(m / 2)].id;
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
