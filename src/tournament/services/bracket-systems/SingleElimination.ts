import { IBracketSystem } from "./IBracketSystem";
import { Division } from "@persistence/entities";

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
        let phase = null;
        let phaseIndex = 1;
        while (matchCount >= 1) {
            console.log("Creating matches: " + matchCount);
            const nextPhase = await this.CreatePhaseWithMatches("Phase_" + phaseIndex++, division, matchCount);

            if (phase != null) //Skip first time, we need match ids from next phase
            {
                for (let i = 0; i < nextPhase.matches.length; i++) {
                    for (let j = 0; j < playerPerMatch; j++) {
                        const currentIndex = indexes[i][j];
                        this.insertAt(
                            phase.matches[currentIndex.match].paths,
                            nextPhase.matches[i].id,
                            currentIndex.playerIndexInMatch);
                    }
                }

                for (let i = 0; i < phase.matches.length; i++) {
                    this.UpdateMatchPaths(phase.matches[i]);
                }
            }

            if (matchCount > 1)
                indexes = this.getIndexes(playerCount, playerPerMatch);

            phase = nextPhase;
            playerCount /= 2;
            matchCount = playerCount / playerPerMatch;
        }

        if (playerPerMatch > 2) {
            console.log("Creating finals");
            const finals = await this.CreatePhaseWithMatches("Finals", division, 2);

            phase.matches[0].paths.push(finals.matches[1].id);
            phase.matches[0].paths.push(finals.matches[1].id);
            phase.matches[0].paths.push(finals.matches[0].id);
            phase.matches[0].paths.push(finals.matches[0].id);

            this.UpdateMatchPaths(phase.matches[0]);
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

        //Next round will have half of the matches
        for (let i = 0; i < matchCount / 2; i++) {
            console.log("creating final i " + i);
            final[i] = [];
        }

        for (let j = 0; j < passingPlayers; j++) {
            let k = j % 2 == 0 ? 0 : (matchCount / 2) - 1; //Every other push from top or bottom
            let increment = j % 2 == 0 ? 1 : -1; //When pushing from top index shall increment, when pushing from bottom shall decrement
            let counter = passingPlayers; //This counter will be used to understand when it is necessary to pass on next match
            console.log("meh");
            for (let i = 0; i < matchCount; i++) {
                console.log("Pushing in k " + k);
                final[k].push({ match: i, playerIndexInMatch: j });

                if (--counter <= 0) {
                    counter = passingPlayers;
                    k += increment;
                }
            }
        }
        console.log("Generated indexes for playerCount " + playerCount + " playerPerMatch " + playerPerMatch);
        console.log(final);
        return final;
    }

    directMatchIndexes(playerCount: number, playerPerMatch: number) {
        console.log("Generating indexes for playerCount " + playerCount + " playerPerMatch " + playerPerMatch);
        const final: PlayerInfo[][] = [];
        let matchCount = playerCount / playerPerMatch;

        //Next round will have half of the matches
        for (let i = 0; i < matchCount / 2; i++) {
            console.log("creating final i " + i);
            final[i] = [];
        }

        let k = 0;
        let counter = playerPerMatch; //This counter will be used to understand when it is necessary to pass on next match

        for (let i = 0; i < matchCount; i++) {
            console.log("Pushing in k " + k);
            final[k].push({ match: i, playerIndexInMatch: 0 });

            if (--counter <= 0) {
                counter = playerPerMatch;
                k += 1;
            }
        }
        
        console.log("Generated indexes for playerCount " + playerCount + " playerPerMatch " + playerPerMatch);
        console.log(final);

        return final;
    }
}