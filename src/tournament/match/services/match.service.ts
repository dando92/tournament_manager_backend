import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Entrant, Match, PhaseGroup } from '@persistence/entities';
import { CreateMatchDto, UpdateMatchDto } from '@match/dtos/match.dto';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';

@Injectable()
export class MatchService {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
        @InjectRepository(PhaseGroup)
        private readonly phaseGroupRepository: Repository<PhaseGroup>,
        @InjectRepository(Entrant)
        private readonly entrantRepository: Repository<Entrant>,
        private readonly uiUpdateGateway: UiUpdateGateway,
    ) {}

    async create(dto: CreateMatchDto): Promise<Match> {
        const match = new Match();
        const phaseGroup = await this.phaseGroupRepository.findOne({
            where: { id: dto.phaseGroupId },
            relations: { phase: true },
        });
        if (!phaseGroup) throw new NotFoundException(`PhaseGroup with ID ${dto.phaseGroupId} not found`);

        match.phaseGroup = Promise.resolve(phaseGroup);
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
        match.name = dto.name;
        if (dto.notes) {
            match.notes = dto.notes;
        }
        match.subtitle = dto.subtitle;

        const savedMatch = await this.matchRepository.save(match);
        await this.uiUpdateGateway.emitPhaseUpdateByPhaseId(phaseGroup.phase?.id);

        return savedMatch;
    }

    async findAll(): Promise<Match[]> {
        return await this.findAllForLobbyLookup();
    }

    async getMatch(id: number): Promise<Match | null> {
        return await this.findOneForView(id);
    }

    async findAllForLobbyLookup(): Promise<Match[]> {
        return await this.matchRepository.find({
            relations: {
                phaseGroup: {
                    phase: true,
                },
                entrants: { participants: { player: true } },
                rounds: {
                    song: true,
                },
                matchResult: true,
            },
        });
    }

    async findByDivisionForView(divisionId: number): Promise<Match[]> {
        return this.matchRepository.find({
            where: {
                phaseGroup: {
                    phase: {
                        division: {
                            id: divisionId,
                        },
                    },
                },
            },
            relations: {
                phaseGroup: {
                    phase: true,
                },
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
                phaseGroup: {
                    phase: true,
                },
                entrants: { participants: { player: true } },
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

        if (dto.phaseGroupId) {
            const phaseGroup = await this.phaseGroupRepository.findOne({
                where: { id: dto.phaseGroupId },
                relations: { phase: true },
            });
            if (!phaseGroup) throw new NotFoundException(`PhaseGroup with ID ${dto.phaseGroupId} not found`);
            match.phaseGroup = Promise.resolve(phaseGroup);
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

        if (dto.targetPaths !== undefined) match.targetPaths = dto.targetPaths;
        if (dto.sourcePaths !== undefined) match.sourcePaths = dto.sourcePaths;
        delete (dto as any).targetPaths;
        delete (dto as any).sourcePaths;

        this.matchRepository.merge(match, dto);
        const updatedMatch = await this.matchRepository.save(match);
        await this.uiUpdateGateway.emitMatchUpdateByMatchId(updatedMatch.id);
        return updatedMatch;
    }

    async delete(id: number): Promise<void> {
        const match = await this.matchRepository.findOne({
            where: { id },
            relations: {
                phaseGroup: {
                    phase: true,
                },
            },
        });
        if (!match) return;
        const phaseGroup = match.phaseGroup ? await match.phaseGroup : null;
        const phaseId = phaseGroup?.phase?.id ?? null;

        const sourcePathIds: number[] = (match.sourcePaths ?? []).map(Number);
        if (sourcePathIds.length > 0) {
            const sourceMatches = await this.matchRepository.findBy({ id: In(sourcePathIds) });
            for (const source of sourceMatches) {
                source.targetPaths = (source.targetPaths ?? []).filter((targetId) => Number(targetId) !== id);
                await this.matchRepository.save(source);
                await this.uiUpdateGateway.emitMatchUpdateByMatchId(source.id);
            }
        }

        await this.matchRepository.remove(match);
        await this.uiUpdateGateway.emitPhaseUpdateByPhaseId(phaseId);
    }
}
