import { IBracketSystem } from "./IBracketSystem";
import { Division, Match, Phase, Player } from "@persistence/entities";

type PlayerInfo = {
    match: number;
    playerIndexInMatch: number;
};

export class SingleElimination extends IBracketSystem {
    getName(): string {
        return "SingleElimination";
    }

    getDescription(): string {
        return "SingleElimination";
    }

    protected async createBracket(players: Player[], playerPerMatch: number, _division: Division, phase: Phase): Promise<void> {
        const firstRound = await this.buildStructure(players.length, playerPerMatch, phase);
        await this.fillFirstWave(players, firstRound, playerPerMatch);
    }

    private async buildStructure(playerCount: number, playerPerMatch: number, phase: Phase): Promise<Match[]> {
        const nextEffN = playerPerMatch * this.nextPow2(Math.ceil(playerCount / playerPerMatch));
        const byes = nextEffN - playerCount;

        if (byes > 0) {
            console.log(`SingleElimination: adding ${byes} bye(s) (effective bracket size: ${nextEffN})`);
        }

        let count = nextEffN;
        let matchCount = count / playerPerMatch;
        let indexes: PlayerInfo[][] = null;
        let currentMatches: Match[] = null;
        let firstRound: Match[] = null;
        let roundIndex = 1;

        while (matchCount >= 1) {
            console.log("Creating matches: " + matchCount);
            const nextMatches = await this.CreateMatchesInPhase("Round_" + roundIndex++, phase, matchCount);

            if (firstRound === null) {
                firstRound = nextMatches;
            }

            if (currentMatches !== null) {
                // Clear nextMatches sourcePaths before populating
                for (let i = 0; i < nextMatches.length; i++) {
                    nextMatches[i].sourcePaths = [];
                }

                for (let i = 0; i < nextMatches.length; i++) {
                    for (let j = 0; j < playerPerMatch; j++) {
                        const currentIndex = indexes[i][j];
                        const sourceMatch = currentMatches[currentIndex.match];
                        this.insertAt(
                            sourceMatch.targetPaths,
                            nextMatches[i].id,
                            currentIndex.playerIndexInMatch);

                        // Add source match to target match's sourcePaths (unique)
                        if (!nextMatches[i].sourcePaths.includes(sourceMatch.id)) {
                            nextMatches[i].sourcePaths.push(sourceMatch.id);
                        }
                    }
                }

                // Save currentMatches (targetPaths set) and nextMatches (sourcePaths set)
                for (let i = 0; i < currentMatches.length; i++) {
                    this.UpdateMatchPaths(currentMatches[i]);
                }
                for (let i = 0; i < nextMatches.length; i++) {
                    this.UpdateMatchPaths(nextMatches[i]);
                }
            }

            if (matchCount > 1) {
                indexes = this.getIndexes(count, playerPerMatch);
            }

            currentMatches = nextMatches;
            count /= 2;
            matchCount = count / playerPerMatch;
        }

        if (playerPerMatch > 2) {
            console.log("Creating finals");
            const finals = await this.CreateMatchesInPhase("Finals", phase, 2);

            currentMatches[0].targetPaths.push(finals[1].id);
            currentMatches[0].targetPaths.push(finals[1].id);
            currentMatches[0].targetPaths.push(finals[0].id);
            currentMatches[0].targetPaths.push(finals[0].id);

            finals[0].sourcePaths = [currentMatches[0].id];
            finals[1].sourcePaths = [currentMatches[0].id];

            this.UpdateMatchPaths(currentMatches[0]);
            this.UpdateMatchPaths(finals[0]);
            this.UpdateMatchPaths(finals[1]);
        }

        return firstRound;
    }

    private insertAt<T>(arr: T[], element: T, index: number): void {
        if (index >= arr.length) {
            arr.push(element);
        } else {
            arr.splice(index, 0, element);
        }
    }

    private getIndexes(playerCount: number, playerPerMatch: number): PlayerInfo[][] {
        if (playerPerMatch > 2) {
            return this.leastRematchIndexes(playerCount, playerPerMatch);
        } else {
            return this.directMatchIndexes(playerCount, playerPerMatch);
        }
    }

    private leastRematchIndexes(playerCount: number, playerPerMatch: number): PlayerInfo[][] {
        console.log("Generating indexes for playerCount " + playerCount + " playerPerMatch " + playerPerMatch);
        const final: PlayerInfo[][] = [];
        const matchCount = playerCount / playerPerMatch;
        const passingPlayers = playerPerMatch / 2;

        for (let i = 0; i < matchCount / 2; i++) {
            final[i] = [];
        }

        for (let j = 0; j < passingPlayers; j++) {
            let k = j % 2 == 0 ? 0 : (matchCount / 2) - 1;
            const increment = j % 2 == 0 ? 1 : -1;
            let counter = passingPlayers;
            for (let i = 0; i < matchCount; i++) {
                final[k].push({ match: i, playerIndexInMatch: j });

                if (--counter <= 0) {
                    counter = passingPlayers;
                    k += increment;
                }
            }
        }
        return final;
    }

    private directMatchIndexes(playerCount: number, playerPerMatch: number): PlayerInfo[][] {
        console.log("Generating indexes for playerCount " + playerCount + " playerPerMatch " + playerPerMatch);
        const final: PlayerInfo[][] = [];
        const matchCount = playerCount / playerPerMatch;

        for (let i = 0; i < matchCount / 2; i++) {
            final[i] = [];
        }

        let k = 0;
        let counter = playerPerMatch;

        for (let i = 0; i < matchCount; i++) {
            final[k].push({ match: i, playerIndexInMatch: 0 });

            if (--counter <= 0) {
                counter = playerPerMatch;
                k += 1;
            }
        }

        return final;
    }
}
