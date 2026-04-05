import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Match, Phase } from '@persistence/entities';

type DivisionUpdatePayload = {
    tournamentId: number;
    divisionId: number;
};

type PhaseUpdatePayload = {
    tournamentId: number;
    divisionId: number;
    phaseId: number;
};

type MatchUpdatePayload = {
    tournamentId: number;
    divisionId: number;
    phaseId: number;
    matchId: number;
};

@Injectable()
export class UiUpdateContextService {
    constructor(
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
    ) {}

    async getDivisionUpdatePayload(divisionId: number): Promise<DivisionUpdatePayload | null> {
        const data = await this.divisionRepository
            .createQueryBuilder('division')
            .leftJoin('division.tournament', 'tournament')
            .select('tournament.id', 'tournamentId')
            .addSelect('division.id', 'divisionId')
            .where('division.id = :divisionId', { divisionId })
            .getRawOne<DivisionUpdatePayload>();

        if (!data?.tournamentId || !data?.divisionId) {
            return null;
        }

        return {
            tournamentId: Number(data.tournamentId),
            divisionId: Number(data.divisionId),
        };
    }

    async getPhaseUpdatePayload(phaseId: number): Promise<PhaseUpdatePayload | null> {
        const data = await this.phaseRepository
            .createQueryBuilder('phase')
            .leftJoin('phase.division', 'division')
            .leftJoin('division.tournament', 'tournament')
            .select('tournament.id', 'tournamentId')
            .addSelect('division.id', 'divisionId')
            .addSelect('phase.id', 'phaseId')
            .where('phase.id = :phaseId', { phaseId })
            .getRawOne<PhaseUpdatePayload>();

        if (!data?.tournamentId || !data?.divisionId || !data?.phaseId) {
            return null;
        }

        return {
            tournamentId: Number(data.tournamentId),
            divisionId: Number(data.divisionId),
            phaseId: Number(data.phaseId),
        };
    }

    async getMatchUpdatePayload(matchId: number): Promise<MatchUpdatePayload | null> {
        const data = await this.matchRepository
            .createQueryBuilder('match')
            .leftJoin('match.phase', 'phase')
            .leftJoin('phase.division', 'division')
            .leftJoin('division.tournament', 'tournament')
            .select('tournament.id', 'tournamentId')
            .addSelect('division.id', 'divisionId')
            .addSelect('phase.id', 'phaseId')
            .addSelect('match.id', 'matchId')
            .where('match.id = :matchId', { matchId })
            .getRawOne<MatchUpdatePayload>();

        if (!data?.tournamentId || !data?.divisionId || !data?.phaseId || !data?.matchId) {
            return null;
        }

        return {
            tournamentId: Number(data.tournamentId),
            divisionId: Number(data.divisionId),
            phaseId: Number(data.phaseId),
            matchId: Number(data.matchId),
        };
    }
}
