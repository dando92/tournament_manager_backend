import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from '@persistence/entities';

@Injectable()
export class DeleteRoundUseCase {
    constructor(
        @InjectRepository(Round)
        private readonly roundsRepo: Repository<Round>,
    ) {}

    async execute(id: number): Promise<void> {
        await this.roundsRepo.delete(id);
    }
}
