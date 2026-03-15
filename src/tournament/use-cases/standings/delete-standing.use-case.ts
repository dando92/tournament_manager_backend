import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Standing } from '@persistence/entities';

@Injectable()
export class DeleteStandingUseCase {
    constructor(
        @InjectRepository(Standing)
        private readonly standingRepo: Repository<Standing>,
    ) {}

    async execute(id: number): Promise<void> {
        await this.standingRepo.delete(id);
    }
}
