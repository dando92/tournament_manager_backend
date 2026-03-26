import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchAssignment, Round, Setup, Player } from '@persistence/entities';
import { CreateMatchAssignmentDto } from '@match/dtos/match_assignment.dto';

@Injectable()
export class CreateMatchAssignmentUseCase {
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

    async execute(dto: CreateMatchAssignmentDto): Promise<MatchAssignment> {
        const matchAssignment = new MatchAssignment();

        const round = await this.roundRepository.findOneBy({ id: dto.roundId });
        if (!round) throw new Error(`Round with id ${dto.roundId} not found. Insert matchAssignment failed`);

        const setup = await this.setupRepository.findOneBy({ id: dto.setupId });
        if (!setup) throw new Error(`Setup with id ${dto.setupId} not found. Insert matchAssignment failed`);

        const player = await this.playerRepository.findOneBy({ id: dto.playerId });
        if (!player) throw new Error(`Player with id ${dto.playerId} not found. Insert matchAssignment failed`);

        matchAssignment.round = round;
        matchAssignment.setup = setup;
        matchAssignment.player = player;

        await this.matchAssignmentRepository.save(matchAssignment);
        return matchAssignment;
    }
}
