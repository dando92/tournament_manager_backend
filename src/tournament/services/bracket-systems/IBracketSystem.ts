import { Inject } from "@nestjs/common";
import { CreateDivisionDto } from "../../dtos";
import { CreateMatchDto } from "../../dtos";
import { UpdateMatchDto } from "../../dtos";

import { Match, Player, Standing, Division } from "@persistence/entities";
import { CreateDivisionUseCase } from "../../use-cases/divisions/create-division.use-case";
import { CreateMatchUseCase } from "../../use-cases/matches/create-match.use-case";
import { GetMatchUseCase } from "../../use-cases/matches/get-match.use-case";
import { UpdateMatchUseCase } from "../../use-cases/matches/update-match.use-case";
import { RemovePlayersFromMatchUseCase } from "../../use-cases/matches/remove-players-from-match.use-case";
import { DeleteStandingUseCase } from "../../use-cases/standings/delete-standing.use-case";

export class IBracketSystem {
    constructor(
        @Inject()
        protected readonly createMatchUseCase: CreateMatchUseCase,
        @Inject()
        protected readonly getMatchUseCase: GetMatchUseCase,
        @Inject()
        protected readonly updateMatchUseCase: UpdateMatchUseCase,
        @Inject()
        protected readonly removePlayersFromMatchUseCase: RemovePlayersFromMatchUseCase,
        @Inject()
        protected readonly createDivisionUseCase: CreateDivisionUseCase,
        @Inject()
        protected readonly deleteStandingUseCase: DeleteStandingUseCase,
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
        division.matches = [];
        await this.createBracket([], playerPerMatch, division);

        return division;
    }

    async generateForDivision(division: Division, players: Player[], playerPerMatch: number = 2): Promise<void> {
        division.matches = division.matches ?? [];
        await this.createBracket(players, playerPerMatch, division);
    }

    async updateBracket(matchId: number) {
        const match = await this.getMatchUseCase.execute(matchId);

        if (match == null)
            return;

        if (match.targetPaths == null)
            return;

        const advanceCount = Math.min(match.targetPaths.length, match.players?.length ?? 0);
        for (let i = 0; i < advanceCount; i++) {
            await this.AddPlayerToMatch(match.players[i], match.targetPaths[i]);

            // Remove this source match from the target match's sourcePaths
            const targetMatchId = match.targetPaths[i];
            const targetMatch = await this.getMatchUseCase.execute(targetMatchId);
            if (targetMatch?.sourcePaths) {
                const dto = new UpdateMatchDto();
                dto.sourcePaths = targetMatch.sourcePaths.filter(id => id !== matchId);
                await this.updateMatchUseCase.execute(targetMatchId, dto);
            }
        }
    }

    async reverseMatchCompletion(matchId: number) {
        const match = await this.getMatchUseCase.execute(matchId);

        if (match == null)
            return;

        if (match.targetPaths == null)
            return;

        const revertCount = Math.min(match.targetPaths.length, match.players?.length ?? 0);
        for (let i = 0; i < revertCount; i++) {
            await this.RemovePlayerFromMatch(match.players[i], match.targetPaths[i]);

            // Re-add this source match to the target match's sourcePaths
            const targetMatchId = match.targetPaths[i];
            const targetMatch = await this.getMatchUseCase.execute(targetMatchId);
            if (targetMatch) {
                const currentSourcePaths = targetMatch.sourcePaths ?? [];
                if (!currentSourcePaths.includes(matchId)) {
                    const dto = new UpdateMatchDto();
                    dto.sourcePaths = [...currentSourcePaths, matchId];
                    await this.updateMatchUseCase.execute(targetMatchId, dto);
                }
            }
        }
    }

    protected async createBracket(_players: Player[], _playerPerMatch: number, _division: Division): Promise<void> {
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

    protected async CreateMatchesInDivision(namePrefix: string, division: Division, matchCount: number): Promise<Match[]> {
        const matches: Match[] = [];
        for (let i = 0; i < matchCount; i++) {
            const match = await this.CreateEmptyMatch(namePrefix + "_Match_" + i, "MatchDescription", division.id);
            match.targetPaths = [];
            match.sourcePaths = [];
            division.matches.push(match);
            matches.push(match);
        }
        return matches;
    }

    protected async UpdateMatchPaths(match: Match) {
        const dto = new UpdateMatchDto();
        if (match.targetPaths !== undefined) dto.targetPaths = match.targetPaths;
        if (match.sourcePaths !== undefined) dto.sourcePaths = match.sourcePaths;
        await this.updateMatchUseCase.execute(match.id, dto);
    }

    protected async CreateEmptyMatch(name: string, desc: string, divisionId: number): Promise<Match> {
        const dto = new CreateMatchDto();

        dto.divisionId = divisionId;
        dto.name = name;
        dto.notes = desc;
        dto.scoringSystem = "EurocupScoreCalculator";

        return await this.createMatchUseCase.execute(dto);
    }

    protected async AddPlayerToMatch(player: Player, matchId: number) {
        const dto = new UpdateMatchDto();

        dto.playerIds = [player.id];

        return await this.updateMatchUseCase.execute(matchId, dto);
    }

    protected async RemovePlayerFromMatch(player: Player, matchId: number) {
        const match = await this.getMatchUseCase.execute(matchId);
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

        this.removePlayersFromMatchUseCase.execute(matchId, [player.id]);
    }
}
