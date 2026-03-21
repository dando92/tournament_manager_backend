import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, Division, Player } from '@persistence/entities';
import { UpdateMatchDto } from '../../dtos';

@Injectable()
export class UpdateMatchUseCase {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        @InjectRepository(Player)
        private readonly playerRepository: Repository<Player>,
    ) {}

    async execute(id: number, dto: UpdateMatchDto): Promise<Match> {
        const match = await this.matchRepository.findOneBy({ id });
        if (!match) throw new Error(`Match with ID ${id} not found`);

        if (dto.divisionId) {
            const division = await this.divisionRepository.findOneBy({ id: dto.divisionId });
            if (!division) throw new NotFoundException(`Division with ID ${dto.divisionId} not found`);
            match.division = Promise.resolve(division);
            delete dto.divisionId;
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
}
