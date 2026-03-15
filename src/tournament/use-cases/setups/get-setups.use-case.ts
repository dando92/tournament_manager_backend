import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setup } from '@persistence/entities';

@Injectable()
export class GetSetupsUseCase {
    constructor(
        @InjectRepository(Setup)
        private readonly setupRepository: Repository<Setup>,
    ) {}

    async execute(): Promise<Setup[]> {
        return await this.setupRepository.find();
    }
}
