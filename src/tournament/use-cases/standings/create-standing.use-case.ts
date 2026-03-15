import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Standing, Score, Round } from '@persistence/entities';
import { CreateStandingDto } from '../../dtos';

@Injectable()
export class CreateStandingUseCase {
    constructor(
        @InjectRepository(Standing)
        private readonly standingRepo: Repository<Standing>,
        @InjectRepository(Score)
        private readonly scoreRepo: Repository<Score>,
        @InjectRepository(Round)
        private readonly roundRepo: Repository<Round>,
    ) {}

    async execute(dto: CreateStandingDto): Promise<Standing> {
        const score = await this.scoreRepo.findOneBy({ id: dto.scoreId });
        if (!score) throw new NotFoundException(`Score with id ${dto.scoreId} not found. Insert standing failed`);

        const round = await this.roundRepo.findOneBy({ id: dto.roundId });
        if (!round) throw new NotFoundException(`Round with id ${dto.roundId} not found. Insert standing failed`);

        const newStanding = new Standing();
        newStanding.score = score;
        newStanding.round = round;
        newStanding.points = dto.points;

        await this.standingRepo.save(newStanding);
        return newStanding;
    }
}
