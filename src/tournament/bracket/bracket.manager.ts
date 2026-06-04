import { Inject, Injectable } from "@nestjs/common";
import { BracketSystemProvider } from "@bracket/BracketSystemProvider";
import { PhaseGroupService } from "@tournament/services/phase-group.service";

@Injectable()
export class BracketManager {
    constructor(
        @Inject()
        private readonly bracketSystemProvider: BracketSystemProvider,
        @Inject()
        private readonly phaseGroupService: PhaseGroupService,
    ) { }

    getBracketTypes(): string[] {
        return this.bracketSystemProvider.getAll();
    }

    async generateForPhaseGroup(phaseGroupId: number, bracketType: string, playerPerMatch: number): Promise<void> {
        const phaseGroup = await this.phaseGroupService.findOne(phaseGroupId);
        if (!phaseGroup) {
            throw new Error(`PhaseGroup ${phaseGroupId} not found`);
        }

        const entrants = await this.phaseGroupService.getEntrantsForBracket(phaseGroupId);
        const phase = phaseGroup.phase;
        const division = phase.division;
        const system = this.bracketSystemProvider.getBracketSystem(bracketType);
        await system.generateForExistingPhaseGroup(division, phase, phaseGroup, entrants, playerPerMatch);
    }
}
