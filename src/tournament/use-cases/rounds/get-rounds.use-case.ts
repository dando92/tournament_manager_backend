import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from '@persistence/entities';

@Injectable()
export class GetRoundsUseCase {
    constructor(
        @InjectRepository(Round)
        private readonly roundsRepo: Repository<Round>,
    ) {}

    async execute(): Promise<Round[]> {
        return await this.roundsRepo.find();
    }
}
