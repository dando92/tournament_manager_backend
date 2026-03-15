import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setup } from '@persistence/entities';
import { UpdateSetupDto } from '../../dtos';

@Injectable()
export class UpdateSetupUseCase {
    constructor(
        @InjectRepository(Setup)
        private readonly setupRepository: Repository<Setup>,
    ) {}

    async execute(id: number, dto: UpdateSetupDto): Promise<Setup> {
        const setup = await this.setupRepository.findOneBy({ id });
        if (!setup) throw new NotFoundException(`Setup with ID ${id} not found`);
        this.setupRepository.merge(setup, dto);
        return await this.setupRepository.save(setup);
    }
}
