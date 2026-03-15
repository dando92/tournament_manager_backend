import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Standing } from '@persistence/entities';

@Injectable()
export class GetStandingUseCase {
    constructor(
        @InjectRepository(Standing)
        private readonly standingRepo: Repository<Standing>,
    ) {}

    async execute(id: number): Promise<Standing | null> {
        return await this.standingRepo.findOneBy({ id });
    }
}
