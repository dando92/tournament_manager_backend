import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entrant, Match, MatchState, Phase, PhaseGroup } from '@persistence/entities';
import { CreateMatchDto, UpdateMatchDto } from '@match/dtos/match.dto';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';
import { AdvancementRuleService } from '@tournament/services/advancement-rule.service';

@Injectable()
export class MatchService {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(PhaseGroup)
        private readonly phaseGroupRepository: Repository<PhaseGroup>,
        @InjectRepository(Entrant)
        private readonly entrantRepository: Repository<Entrant>,
        private readonly uiUpdateGateway: UiUpdateGateway,
        private readonly advancementRuleService: AdvancementRuleService,
    ) {}

    async create(dto: CreateMatchDto): Promise<Match> {
        const match = new Match();

        const phase = await this.phaseRepository.findOneBy({ id: dto.phaseId });
        if (!phase) throw new NotFoundException(`Phase with ID ${dto.phaseId} not found`);
        match.phase = Promise.resolve(phase);

        if (dto.phaseGroupId !== undefined) {
            const phaseGroup = await this.phaseGroupRepository.findOne({
                where: { id: dto.phaseGroupId, phase: { id: dto.phaseId } },
                relations: { phase: true },
            });
            if (!phaseGroup) throw new NotFoundException(`PhaseGroup with ID ${dto.phaseGroupId} not found`);
            match.phaseGroup = phaseGroup;
        } else {
            match.phaseGroup = await this.phaseGroupRepository.findOne({
                where: { phase: { id: dto.phaseId } },
                order: { id: 'ASC' },
            });
        }

        match.entrants = [];

        if (dto.entrantIds !== undefined) {
            for (const entrantId of dto.entrantIds) {
                const entrant = await this.entrantRepository.findOne({
                    where: { id: entrantId },
                    relations: { participants: { player: true } },
                });
                if (!entrant) throw new NotFoundException(`Entrant with ID ${entrantId} not found`);
                match.entrants.push(entrant);
            }
        }

        match.scoringSystem = dto.scoringSystem;
        match.state = MatchState.NotActive;
        match.name = dto.name;
        if (dto.notes) {
            match.notes = dto.notes;
        }
        match.subtitle = dto.subtitle;

        const savedMatch = await this.matchRepository.save(match);
        await this.uiUpdateGateway.emitPhaseUpdateByPhaseId(dto.phaseId);

        return savedMatch;
    }

    async getMatch(id: number): Promise<Match | null> {
        return await this.findOneForView(id);
    }

    async findActiveByTournamentForLobbyLookup(tournamentId: number): Promise<Match[]> {
        return await this.matchRepository.find({
            where: {
                state: MatchState.Active,
                phase: {
                    division: {
                        tournament: {
                            id: tournamentId,
                        },
                    },
                },
            },
            relations: {
                entrants: { participants: { player: true } },
                rounds: {
                    song: true,
                    standings: {
                        score: {
                            player: true,
                            song: true,
                        },
                    },
                },
                matchResult: true,
            },
        });
    }

    async findByDivisionForView(divisionId: number): Promise<Match[]> {
        return this.matchRepository.find({
            where: {
                phase: {
                    division: {
                        id: divisionId,
                    },
                },
            },
            relations: {
                phase: true,
                phaseGroup: true,
                entrants: { participants: { player: true } },
                rounds: {
                    song: true,
                    standings: {
                        score: {
                            player: true,
                        },
                    },
                },
                matchResult: true,
            },
        });
    }

    async findOneForView(id: number): Promise<Match | null> {
        return await this.matchRepository.findOne({
            where: { id },
            relations: {
                entrants: { participants: { player: true } },
                phaseGroup: true,
                rounds: {
                    song: true,
                    standings: {
                        score: {
                            player: true,
                            song: true,
                        },
                    },
                    matchAssignments: true,
                },
                matchResult: true,
            },
        });
    }

    async findOneBasic(id: number): Promise<Match | null> {
        return await this.matchRepository.findOneBy({ id });
    }

    async update(id: number, dto: UpdateMatchDto): Promise<Match> {
        const match = await this.findOneBasic(id);
        if (!match) throw new Error(`Match with ID ${id} not found`);

        if (dto.phaseId) {
            const phase = await this.phaseRepository.findOneBy({ id: dto.phaseId });
            if (!phase) throw new NotFoundException(`Phase with ID ${dto.phaseId} not found`);
            match.phase = Promise.resolve(phase);
            delete dto.phaseId;
        }

        if (dto.phaseGroupId !== undefined) {
            const phase = await match.phase;
            const phaseGroup = await this.phaseGroupRepository.findOne({
                where: { id: dto.phaseGroupId, phase: { id: phase.id } },
                relations: { phase: true },
            });
            if (!phaseGroup) throw new NotFoundException(`PhaseGroup with ID ${dto.phaseGroupId} not found`);
            match.phaseGroup = phaseGroup;
            delete dto.phaseGroupId;
        }

        if (dto.entrantIds !== undefined) {
            const entrants = [];
            for (const entrantId of dto.entrantIds) {
                const entrant = await this.entrantRepository.findOne({
                    where: { id: entrantId },
                    relations: { participants: { player: true } },
                });
                if (!entrant) throw new NotFoundException(`Entrant with ID ${entrantId} not found`);
                entrants.push(entrant);
            }
            match.entrants = entrants;
            delete dto.entrantIds;
        }

        this.matchRepository.merge(match, dto);
        const updatedMatch = await this.matchRepository.save(match);
        await this.uiUpdateGateway.emitMatchUpdateByMatchId(updatedMatch.id);
        return updatedMatch;
    }

    async updateState(id: number, state: MatchState): Promise<Match> {
        const match = await this.findOneBasic(id);
        if (!match) throw new Error(`Match with ID ${id} not found`);

        match.state = state;
        const updatedMatch = await this.matchRepository.save(match);
        await this.uiUpdateGateway.emitMatchUpdateByMatchId(updatedMatch.id);
        return updatedMatch;
    }

    async delete(id: number): Promise<void> {
        const match = await this.findOneBasic(id);
        if (!match) return;
        const phase = await match.phase;
        const phaseId = phase?.id;

        await this.advancementRuleService.deleteInvolvingMatch(id);

        await this.matchRepository.remove(match);
        await this.uiUpdateGateway.emitPhaseUpdateByPhaseId(phaseId);
    }
}
