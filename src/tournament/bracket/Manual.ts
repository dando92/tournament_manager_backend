import { IBracketSystem } from "@bracket/IBracketSystem";
import { Division, Phase, Player } from "@persistence/entities";

export class Manual extends IBracketSystem {
    getName(): string {
        return "Manual";
    }

    getDescription(): string {
        return "Manual";
    }

    protected async createBracket(_players: Player[], _playerPerMatch: number, _division: Division, _phase: Phase): Promise<void> {
        const matchCount = Math.ceil(_players.length / _playerPerMatch);
        const matches = await this.CreateMatchesInPhase("Match", _phase, matchCount);
        await this.fillFirstWave(_players, matches, _playerPerMatch);
    }
}
