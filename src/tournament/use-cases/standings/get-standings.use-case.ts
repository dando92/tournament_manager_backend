import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Standing } from '@persistence/entities';

@Injectable()
export class GetStandingsUseCase {
    constructor(
        @InjectRepository(Standing)
        private readonly standingRepo: Repository<Standing>,
    ) {}

    async execute(): Promise<Standing[]> {
        return await this.standingRepo.find();
    }
}
