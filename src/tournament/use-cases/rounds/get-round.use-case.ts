import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from '@persistence/entities';

@Injectable()
export class GetRoundUseCase {
    constructor(
        @InjectRepository(Round)
        private readonly roundsRepo: Repository<Round>,
    ) {}

    async execute(id: number): Promise<Round | null> {
        return await this.roundsRepo.findOneBy({ id });
    }
}
