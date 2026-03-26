import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, Phase, Player } from '@persistence/entities';
import { CreateMatchDto, UpdateMatchDto } from '@match/dtos/match.dto';

@Injectable()
export class MatchService {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Player)
        private readonly playerRepository: Repository<Player>,
    ) {}

    async create(dto: CreateMatchDto): Promise<Match> {
        const match = new Match();

        const phase = await this.phaseRepository.findOneBy({ id: dto.phaseId });
        if (!phase) throw new NotFoundException(`Phase with ID ${dto.phaseId} not found`);
        match.phase = Promise.resolve(phase);

        match.players = [];

        if (dto.playerIds) {
            for (const playerId of dto.playerIds) {
                const player = await this.playerRepository.findOneBy({ id: playerId });
                if (!player) throw new NotFoundException(`Player with ID ${playerId} not found`);
                match.players.push(player);
            }
        }

        match.scoringSystem = dto.scoringSystem;
        match.name = dto.name;
        if (dto.notes) {
            match.notes = dto.notes;
        }
        match.subtitle = dto.subtitle;

        await this.matchRepository.save(match);

        return match;
    }

    async findAll(): Promise<Match[]> {
        return await this.matchRepository.find();
    }

    async getMatch(id: number): Promise<Match | null> {
        return await this.matchRepository.findOneBy({ id });
    }

    async update(id: number, dto: UpdateMatchDto): Promise<Match> {
        const match = await this.matchRepository.findOneBy({ id });
        if (!match) throw new Error(`Match with ID ${id} not found`);

        if (dto.phaseId) {
            const phase = await this.phaseRepository.findOneBy({ id: dto.phaseId });
            if (!phase) throw new NotFoundException(`Phase with ID ${dto.phaseId} not found`);
            match.phase = Promise.resolve(phase);
            delete dto.phaseId;
        }

        if (dto.playerIds) {
            const players = [];
            for (const playerId of dto.playerIds) {
                const player = await this.playerRepository.findOneBy({ id: playerId });
                if (!player) throw new NotFoundException(`Player with ID ${playerId} not found`);
                players.push(player);
            }
            dto.players = players;
            delete dto.playerIds;
        }

        if (dto.targetPaths !== undefined) match.targetPaths = dto.targetPaths;
        if (dto.sourcePaths !== undefined) match.sourcePaths = dto.sourcePaths;
        delete (dto as any).targetPaths;
        delete (dto as any).sourcePaths;

        this.matchRepository.merge(match, dto);
        return await this.matchRepository.save(match);
    }

    async delete(id: number): Promise<void> {
        const match = await this.matchRepository.findOneBy({ id });
        if (!match) return;

        const sourcePathIds: number[] = (match.sourcePaths ?? []).map(Number);
        if (sourcePathIds.length > 0) {
            const sourceMatches = await this.matchRepository.findByIds(sourcePathIds);
            for (const source of sourceMatches) {
                source.targetPaths = (source.targetPaths ?? []).filter(t => Number(t) !== id);
                await this.matchRepository.save(source);
            }
        }

        await this.matchRepository.remove(match);
    }
}
