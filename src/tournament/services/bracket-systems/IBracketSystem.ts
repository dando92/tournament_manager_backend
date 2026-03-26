import { Inject } from "@nestjs/common";
import { CreateDivisionDto } from "../../dtos";
import { CreateMatchDto } from "../../dtos";
import { UpdateMatchDto } from "../../dtos";

import { Match, Player, Standing, Division, Phase } from "@persistence/entities";
import { CreateDivisionUseCase } from "../../use-cases/divisions/create-division.use-case";
import { DeleteStandingUseCase } from "../../use-cases/standings/delete-standing.use-case";
import { CreatePhaseUseCase } from "../../use-cases/phases/create-phase.use-case";
import { CreatePhaseDto } from "../../dtos";
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

    async create(divisionName: string, tournamentId: number, playerPerMatch: number): Promise<Division> {
        const dto = new CreateDivisionDto();
        dto.name = divisionName;
        dto.tournamentId = tournamentId;
        const division = await this.createDivisionUseCase.execute(dto);

        const phaseDto = new CreatePhaseDto();
        phaseDto.name = "Bracket 1";
        phaseDto.divisionId = division.id;
        const phase = await this.createPhaseUseCase.execute(phaseDto);
        phase.matches = [];

        await this.createBracket([], playerPerMatch, division, phase);

        return division;
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

    async advanceSortedPlayers(match: Match, sortedPlayers: Player[]) {
        if (!match.targetPaths?.length) return;

        const advanceCount = Math.min(match.targetPaths.length, sortedPlayers.length);
        for (let i = 0; i < advanceCount; i++) {
            await this.AddPlayerToMatch(sortedPlayers[i], match.targetPaths[i]);

            const targetMatchId = match.targetPaths[i];
            const targetMatch = await this.matchManager.GetMatch(targetMatchId);
            if (targetMatch?.sourcePaths) {
                const dto = new UpdateMatchDto();
                dto.sourcePaths = targetMatch.sourcePaths.filter(id => id !== match.id);
                await this.matchManager.UpdateMatch(targetMatchId, dto);
            }
        }
    }

    async updateBracket(matchId: number) {
        const match = await this.matchManager.GetMatch(matchId);

        if (match == null)
            return;

        if (match.targetPaths == null)
            return;

        const advanceCount = Math.min(match.targetPaths.length, match.players?.length ?? 0);
        for (let i = 0; i < advanceCount; i++) {
            await this.AddPlayerToMatch(match.players[i], match.targetPaths[i]);

            // Remove this source match from the target match's sourcePaths
            const targetMatchId = match.targetPaths[i];
            const targetMatch = await this.matchManager.GetMatch(targetMatchId);
            if (targetMatch?.sourcePaths) {
                const dto = new UpdateMatchDto();
                dto.sourcePaths = targetMatch.sourcePaths.filter(id => id !== matchId);
                await this.matchManager.UpdateMatch(targetMatchId, dto);
            }
        }
    }

    async reverseMatchCompletion(matchId: number) {
        const match = await this.matchManager.GetMatch(matchId);

        if (match == null)
            return;

        if (match.targetPaths == null)
            return;

        const revertCount = Math.min(match.targetPaths.length, match.players?.length ?? 0);
        for (let i = 0; i < revertCount; i++) {
            await this.RemovePlayerFromMatch(match.players[i], match.targetPaths[i]);

            // Re-add this source match to the target match's sourcePaths
            const targetMatchId = match.targetPaths[i];
            const targetMatch = await this.matchManager.GetMatch(targetMatchId);
            if (targetMatch) {
                const currentSourcePaths = targetMatch.sourcePaths ?? [];
                if (!currentSourcePaths.includes(matchId)) {
                    const dto = new UpdateMatchDto();
                    dto.sourcePaths = [...currentSourcePaths, matchId];
                    await this.matchManager.UpdateMatch(targetMatchId, dto);
                }
            }
        }
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
        const dto = new UpdateMatchDto();

        dto.playerIds = [player.id];

        return await this.matchManager.UpdateMatch(matchId, dto);
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
