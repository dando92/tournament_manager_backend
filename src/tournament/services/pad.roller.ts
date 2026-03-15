import { Inject, Injectable } from "@nestjs/common";
import { CreateMatchAssignmentDto } from '../../tournament/dtos';
import { Match, MatchAssignment, Setup } from '@persistence/entities';
import { CreateMatchAssignmentUseCase } from '../use-cases/match-assignments/create-match-assignment.use-case';

@Injectable()
export class PadRoller {
    constructor(
        @Inject()
        private createMatchAssignmentUseCase: CreateMatchAssignmentUseCase) { }

    async AutoRollPads(match: Match) {
        const rounds = match.rounds;
        const players = match.players;
        const setups: Setup[] = null;

        setups.sort((a, b) => a.position - b.position);

        for (let i = 0; i < rounds.length; i++) {
            const matchAssignment = new CreateMatchAssignmentDto();
            const matchAssignments: MatchAssignment[] = [];

            for (let j = 0; j < players.length; j++) {
                matchAssignment.playerId = players[j].id;
                matchAssignment.setupId = setups[j].id;
                matchAssignment.roundId = rounds[i].id;

                matchAssignments.push(await this.createMatchAssignmentUseCase.execute(matchAssignment));
            }

            setups.push(setups.shift());

            match.rounds[i].matchAssignments = matchAssignments;
        }

        return match;
    }
}