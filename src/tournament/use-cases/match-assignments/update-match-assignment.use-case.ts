import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchAssignment, Round, Setup, Player } from '@persistence/entities';
import { UpdateMatchAssignmentDto } from '../../dtos';

@Injectable()
export class UpdateMatchAssignmentUseCase {
    constructor(
        @InjectRepository(MatchAssignment)
        private readonly matchAssignmentRepository: Repository<MatchAssignment>,
        @InjectRepository(Round)
        private readonly roundRepository: Repository<Round>,
        @InjectRepository(Setup)
        private readonly setupRepository: Repository<Setup>,
        @InjectRepository(Player)
        private readonly playerRepository: Repository<Player>,
    ) {}

    async execute(id: number, dto: UpdateMatchAssignmentDto): Promise<MatchAssignment> {
        const matchAssignment = await this.matchAssignmentRepository.findOneBy({ id });
        if (!matchAssignment) throw new NotFoundException(`MatchAssignment with id ${id} not found. Update MatchAssignment failed`);

        if (dto.roundId) {
            const round = await this.roundRepository.findOneBy({ id: dto.roundId });
            if (!round) throw new NotFoundException(`Round with id ${dto.round} not found. Update MatchAssignment failed`);
            dto.round = round;
            delete dto.roundId;
        }

        if (dto.setupId) {
            const setup = await this.setupRepository.findOneBy({ id: dto.setupId });
            if (!setup) throw new NotFoundException(`Setup with id ${dto.setupId} not found. Update MatchAssignment failed`);
            dto.setup = setup;
            delete dto.setupId;
        }

        if (dto.playerId) {
            const player = await this.playerRepository.findOneBy({ id: dto.playerId });
            if (!player) throw new NotFoundException(`Player with id ${dto.playerId} not found. Update MatchAssignment failed`);
            dto.player = player;
            delete dto.playerId;
        }

        this.matchAssignmentRepository.merge(matchAssignment, dto);
        return await this.matchAssignmentRepository.save(matchAssignment);
    }
}
