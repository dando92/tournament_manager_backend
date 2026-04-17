import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Entrant, Match, Phase } from '@persistence/entities';
import { CreateMatchDto, UpdateMatchDto } from '@match/dtos/match.dto';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';

@Injectable()
export class MatchService {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Entrant)
        private readonly entrantRepository: Repository<Entrant>,
        private readonly uiUpdateGateway: UiUpdateGateway,
    ) {}

    async create(dto: CreateMatchDto): Promise<Match> {
        const match = new Match();

        const phase = await this.phaseRepository.findOneBy({ id: dto.phaseId });
        if (!phase) throw new NotFoundException(`Phase with ID ${dto.phaseId} not found`);
        match.phase = Promise.resolve(phase);

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
        await this.uiUpdateGateway.emitPhaseUpdateByPhaseId(dto.phaseId);

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
                phase: {
                    division: {
                        id: divisionId,
                    },
                },
            },
            relations: {
                phase: true,
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
        const match = await this.findOneBasic(id);
        if (!match) return;
        const phase = await match.phase;
        const phaseId = phase?.id;

        const sourcePathIds: number[] = (match.sourcePaths ?? []).map(Number);
        if (sourcePathIds.length > 0) {
            const sourceMatches = await this.matchRepository.findBy({ id: In(sourcePathIds) });
            for (const source of sourceMatches) {
                source.targetPaths = (source.targetPaths ?? []).filter(t => Number(t) !== id);
                await this.matchRepository.save(source);
                await this.uiUpdateGateway.emitMatchUpdateByMatchId(source.id);
            }
        }

        await this.matchRepository.remove(match);
        await this.uiUpdateGateway.emitPhaseUpdateByPhaseId(phaseId);
    }
}
