import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setup } from '@persistence/entities';

@Injectable()
export class DeleteSetupUseCase {
    constructor(
        @InjectRepository(Setup)
        private readonly setupRepository: Repository<Setup>,
    ) {}

    async execute(id: number): Promise<void> {
        await this.setupRepository.delete(id);
    }
}
