import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, Phase, Player } from '@persistence/entities';
import { UpdateMatchDto } from '../../dtos';

@Injectable()
export class UpdateMatchUseCase {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Player)
        private readonly playerRepository: Repository<Player>,
    ) {}

    async execute(id: number, dto: UpdateMatchDto): Promise<Match> {
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

        this.matchRepository.merge(match, dto);
        return await this.matchRepository.save(match);
    }
}
