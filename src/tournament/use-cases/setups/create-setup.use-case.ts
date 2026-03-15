import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setup } from '@persistence/entities';
import { CreateSetupDto } from '../../dtos';

@Injectable()
export class CreateSetupUseCase {
    constructor(
        @InjectRepository(Setup)
        private readonly setupRepository: Repository<Setup>,
    ) {}

    async execute(dto: CreateSetupDto): Promise<Setup> {
        const setup = new Setup();
        setup.name = dto.name;
        setup.cabinetName = dto.cabinetName;
        setup.position = dto.position;
        await this.setupRepository.save(setup);
        return setup;
    }
}
