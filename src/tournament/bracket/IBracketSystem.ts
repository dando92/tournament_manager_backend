import { Inject } from "@nestjs/common";
import { CreateDivisionDto } from "@tournament/dtos";
import { CreateMatchDto } from "@tournament/dtos";
import { UpdateMatchDto } from "@tournament/dtos";

import { Match, Player, Standing, Division, Phase } from "@persistence/entities";
import { CreateDivisionUseCase } from "@tournament/use-cases/divisions/create-division.use-case";
import { DeleteStandingUseCase } from "@tournament/use-cases/standings/delete-standing.use-case";
import { CreatePhaseUseCase } from "@tournament/use-cases/phases/create-phase.use-case";
import { CreatePhaseDto } from "@tournament/dtos";
import { MatchManager } from "@match/services/match.manager";
import { MatchService } from "@match/services/match.service";

export class IBracketSystem {
    constructor(
        @Inject()
        protected readonly matchService: MatchService,
        @Inject()
        protected readonly matchManager: MatchManager,
        @Inject()
        protected readonly createDivisionUseCase: CreateDivisionUseCase,
        @Inject()
        protected readonly deleteStandingUseCase: DeleteStandingUseCase,
        @Inject()
        protected readonly createPhaseUseCase: CreatePhaseUseCase,
    ) {
    }

    getName(): string {
        throw new Error("Method 'Name' should be implemented.");
    }

    getDescription(): string {
        throw new Error("Method 'Description' should be implemented.");
    }

    async generateForDivision(division: Division, players: Player[], playerPerMatch: number = 2): Promise<void> {
        const phaseNumber = (division.phases?.length ?? 0) + 1;
        const phaseDto = new CreatePhaseDto();
        phaseDto.name = `Bracket ${phaseNumber}`;
        phaseDto.divisionId = division.id;
        const phase = await this.createPhaseUseCase.execute(phaseDto);
        phase.matches = [];

        await this.createBracket(players, playerPerMatch, division, phase);
    }

    protected async createBracket(_players: Player[], _playerPerMatch: number, _division: Division, _phase: Phase): Promise<void> {
        throw new Error("Method 'createBracket' should be implemented.");
    }

    protected nextPow2(x: number): number {
        let p = 1;
        while (p < x) p *= 2;
        return p;
    }

    protected async fillFirstWave(players: Player[], firstRound: Match[], playerPerMatch: number): Promise<void> {
        for (let i = 0; i < players.length; i++) {
            const matchIndex = Math.floor(i / playerPerMatch);
            if (matchIndex < firstRound.length) {
                await this.AddPlayerToMatch(players[i], firstRound[matchIndex].id);
            }
        }
    }

    protected async CreateMatchesInPhase(namePrefix: string, phase: Phase, matchCount: number): Promise<Match[]> {
        const matches: Match[] = [];
        for (let i = 0; i < matchCount; i++) {
            const match = await this.CreateEmptyMatch(namePrefix + "_Match_" + i, "MatchDescription", phase.id);
            match.targetPaths = [];
            match.sourcePaths = [];
            phase.matches.push(match);
            matches.push(match);
        }
        return matches;
    }

    protected async UpdateMatchPaths(match: Match) {
        const dto = new UpdateMatchDto();
        if (match.targetPaths !== undefined) dto.targetPaths = match.targetPaths;
        if (match.sourcePaths !== undefined) dto.sourcePaths = match.sourcePaths;
        await this.matchManager.UpdateMatch(match.id, dto);
    }

    protected async CreateEmptyMatch(name: string, desc: string, phaseId: number): Promise<Match> {
        const dto = new CreateMatchDto();

        dto.phaseId = phaseId;
        dto.name = name;
        dto.notes = desc;
        dto.scoringSystem = "EurocupScoreCalculator";

        return await this.matchService.create(dto);
    }

    protected async AddPlayerToMatch(player: Player, matchId: number) {
        return await this.matchManager.AddPlayerInMatch(matchId, player.id);
    }

    protected async RemovePlayerFromMatch(player: Player, matchId: number) {
        const match = await this.matchManager.GetMatch(matchId);
        const standings: Standing[] = [];

        for (const round of match.rounds) {
            for (const standing of round.standings) {
                if (standing.score.player.id == player.id) {
                    standings.push(standing);
                }

            }
        }

        for (const standing of standings) {
            this.deleteStandingUseCase.execute(standing.id);
        }

        this.matchManager.RemovePlayersFromMatch(matchId, [player.id]);
    }
}
