import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, Phase, Player } from '@persistence/entities';
import { CreateMatchDto } from '../../dtos';

@Injectable()
export class CreateMatchUseCase {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Player)
        private readonly playerRepository: Repository<Player>,
    ) {}

    async execute(dto: CreateMatchDto): Promise<Match> {
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
}
