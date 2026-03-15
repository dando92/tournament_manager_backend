import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Standing, Score, Round } from '@persistence/entities';
import { UpdateStandingDto } from '../../dtos';

@Injectable()
export class UpdateStandingUseCase {
    constructor(
        @InjectRepository(Standing)
        private readonly standingRepo: Repository<Standing>,
        @InjectRepository(Score)
        private readonly scoreRepo: Repository<Score>,
        @InjectRepository(Round)
        private readonly roundRepo: Repository<Round>,
    ) {}

    async execute(id: number, dto: UpdateStandingDto): Promise<Standing> {
        const standing = await this.standingRepo.findOneBy({ id });
        if (!standing) throw new NotFoundException(`Standing with id ${id} not found. Update standing failed`);

        if (dto.scoreId) {
            const updatedScore = await this.scoreRepo.findOneBy({ id: dto.scoreId });
            if (!updatedScore) throw new NotFoundException(`Score with id ${dto.scoreId} not found. Update standing failed`);
            dto.score = updatedScore;
            delete dto.scoreId;
        }

        if (dto.roundId) {
            const updatedRound = await this.roundRepo.findOneBy({ id: dto.roundId });
            if (!updatedRound) throw new NotFoundException(`Round with id ${dto.roundId} not found. Update standing failed`);
            dto.round = updatedRound;
            delete dto.roundId;
        }

        this.standingRepo.merge(standing, dto);
        return await this.standingRepo.save(standing);
    }
}
