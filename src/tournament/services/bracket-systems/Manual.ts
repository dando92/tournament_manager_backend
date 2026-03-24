import { IBracketSystem } from "./IBracketSystem";
import { CreatePhaseDto } from "../../dtos";
import { Division, Phase, Player } from "@persistence/entities";

export class Manual extends IBracketSystem {
    getName(): string {
        return "Manual";
    }

    getDescription(): string {
        return "Manual";
    }

    protected async createBracket(_players: Player[], _playerPerMatch: number, _division: Division, _phase: Phase): Promise<void> {
        // Manual bracket — no automatic structure
    }

    async generateForDivision(division: Division, players: Player[], playerPerMatch: number): Promise<void> {
        const phaseNumber = (division.phases?.length ?? 0) + 1;
        const phaseDto = new CreatePhaseDto();
        phaseDto.name = `Bracket ${phaseNumber}`;
        phaseDto.divisionId = division.id;
        const phase = await this.createPhaseUseCase.execute(phaseDto);
        phase.matches = [];

        const matchCount = Math.ceil(players.length / playerPerMatch);
        const matches = await this.CreateMatchesInPhase("Match", phase, matchCount);
        await this.fillFirstWave(players, matches, playerPerMatch);
    }
}
