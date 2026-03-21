import { IBracketSystem } from "./IBracketSystem";
import { Division, Match } from "@persistence/entities";

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

    protected async createBracket(orderedplayers: string[], playerPerMatch: number, division: Division) {
        const nextEffN = playerPerMatch * this.nextPow2(Math.ceil(orderedplayers.length / playerPerMatch));
        const byes = nextEffN - orderedplayers.length;

        if (byes > 0) {
            console.log(`SingleElimination: adding ${byes} bye(s) (effective bracket size: ${nextEffN})`);
        }

        let playerCount = nextEffN;
        let matchCount = playerCount / playerPerMatch;
        let indexes = null;
        let currentMatches: Match[] = null;
        let roundIndex = 1;
        while (matchCount >= 1) {
            console.log("Creating matches: " + matchCount);
            const nextMatches = await this.CreateMatchesInDivision("Round_" + roundIndex++, division, matchCount);

            if (currentMatches != null) {
                for (let i = 0; i < nextMatches.length; i++) {
                    for (let j = 0; j < playerPerMatch; j++) {
                        const currentIndex = indexes[i][j];
                        this.insertAt(
                            currentMatches[currentIndex.match].paths,
                            nextMatches[i].id,
                            currentIndex.playerIndexInMatch);
                    }
                }

                for (let i = 0; i < currentMatches.length; i++) {
                    this.UpdateMatchPaths(currentMatches[i]);
                }
            }

            if (matchCount > 1)
                indexes = this.getIndexes(playerCount, playerPerMatch);

            currentMatches = nextMatches;
            playerCount /= 2;
            matchCount = playerCount / playerPerMatch;
        }

        if (playerPerMatch > 2) {
            console.log("Creating finals");
            const finals = await this.CreateMatchesInDivision("Finals", division, 2);

            currentMatches[0].paths.push(finals[1].id);
            currentMatches[0].paths.push(finals[1].id);
            currentMatches[0].paths.push(finals[0].id);
            currentMatches[0].paths.push(finals[0].id);

            this.UpdateMatchPaths(currentMatches[0]);
        }
    }

    private nextPow2(x: number): number {
        let p = 1;
        while (p < x) p *= 2;
        return p;
    }

    insertAt<T>(arr: T[], element: T, index: number) {
        if (index >= arr.length) {
            arr.push(element);
        } else {
            arr.splice(index, 0, element);
        }
    }

    getIndexes(playerCount: number, playerPerMatch: number) {
        if (playerPerMatch > 2) {
            return this.leastRematchIndexes(playerCount, playerPerMatch);
        } else {
            return this.directMatchIndexes(playerCount, playerPerMatch);
        }
    }

    leastRematchIndexes(playerCount: number, playerPerMatch: number) {
        console.log("Generating indexes for playerCount " + playerCount + " playerPerMatch " + playerPerMatch);
        const final: PlayerInfo[][] = [];
        let matchCount = playerCount / playerPerMatch;
        let passingPlayers = playerPerMatch / 2;

        for (let i = 0; i < matchCount / 2; i++) {
            final[i] = [];
        }

        for (let j = 0; j < passingPlayers; j++) {
            let k = j % 2 == 0 ? 0 : (matchCount / 2) - 1;
            let increment = j % 2 == 0 ? 1 : -1;
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

    directMatchIndexes(playerCount: number, playerPerMatch: number) {
        console.log("Generating indexes for playerCount " + playerCount + " playerPerMatch " + playerPerMatch);
        const final: PlayerInfo[][] = [];
        let matchCount = playerCount / playerPerMatch;

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
