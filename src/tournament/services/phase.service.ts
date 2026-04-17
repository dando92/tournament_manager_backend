import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Phase, PhaseGroup } from '@persistence/entities';
import { CreatePhaseDto } from '../dtos';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';

@Injectable()
export class PhaseService {
    constructor(
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(PhaseGroup)
        private readonly phaseGroupRepository: Repository<PhaseGroup>,
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        private readonly uiUpdateGateway: UiUpdateGateway,
    ) {}

    async create(dto: CreatePhaseDto): Promise<Phase> {
        const division = await this.divisionRepository.findOneBy({ id: dto.divisionId });
        if (!division) throw new NotFoundException(`Division with ID ${dto.divisionId} not found`);

        const phase = new Phase();
        phase.name = dto.name;
        phase.type = dto.type ?? 'bracket';
        phase.division = division;

        const savedPhase = await this.phaseRepository.save(phase);
        await this.uiUpdateGateway.emitDivisionUpdateByDivisionId(dto.divisionId);
        return savedPhase;
    }

    async createPhaseGroup(phaseId: number, name: string, mode: 'set-driven' | 'progression-driven' = 'set-driven'): Promise<PhaseGroup> {
        const phase = await this.phaseRepository.findOne({
            where: { id: phaseId },
            relations: { division: true },
        });
        if (!phase) throw new NotFoundException(`Phase with ID ${phaseId} not found`);

        const phaseGroup = new PhaseGroup();
        phaseGroup.name = name;
        phaseGroup.mode = mode;
        phaseGroup.phase = phase;

        const savedPhaseGroup = await this.phaseGroupRepository.save(phaseGroup);
        await this.uiUpdateGateway.emitPhaseUpdateByPhaseId(phaseId);
        return savedPhaseGroup;
    }

    async findOverviewDataForDivision(divisionId: number): Promise<Phase[]> {
        return this.phaseRepository.find({
            where: { division: { id: divisionId } },
            relations: {
                phaseGroups: {
                    matches: true,
                },
            },
        });
    }

    async delete(id: number): Promise<void> {
        const phase = await this.phaseRepository.findOne({
            where: { id },
            relations: { division: true },
        });

        if (!phase) throw new NotFoundException(`Phase with ID ${id} not found`);

        await this.phaseRepository.delete(id);
        await this.uiUpdateGateway.emitDivisionUpdateByDivisionId(phase.division.id);
    }
}
