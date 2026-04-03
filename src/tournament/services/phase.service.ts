import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Phase } from '@persistence/entities';
import { CreatePhaseDto } from '../dtos';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';

@Injectable()
export class PhaseService {
    constructor(
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        private readonly uiUpdateGateway: UiUpdateGateway,
    ) {}

    async create(dto: CreatePhaseDto): Promise<Phase> {
        const division = await this.divisionRepository.findOneBy({ id: dto.divisionId });
        if (!division) throw new NotFoundException(`Division with ID ${dto.divisionId} not found`);

        const phase = new Phase();
        phase.name = dto.name;
        phase.division = division;

        const savedPhase = await this.phaseRepository.save(phase);
        await this.uiUpdateGateway.emitDivisionUpdateByDivisionId(dto.divisionId);
        return savedPhase;
    }
}
