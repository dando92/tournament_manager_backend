import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setup } from '@persistence/entities';

@Injectable()
export class GetSetupUseCase {
    constructor(
        @InjectRepository(Setup)
        private readonly setupRepository: Repository<Setup>,
    ) {}

    async execute(id: number): Promise<Setup | null> {
        return await this.setupRepository.findOneBy({ id });
    }
}
