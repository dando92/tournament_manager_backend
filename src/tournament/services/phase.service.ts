import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Entrant, Phase, PhaseGroup, PhaseSeed } from '@persistence/entities';
import { CreatePhaseDto } from '../dtos';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';

@Injectable()
export class PhaseService {
    constructor(
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(PhaseGroup)
        private readonly phaseGroupRepository: Repository<PhaseGroup>,
        @InjectRepository(PhaseSeed)
        private readonly phaseSeedRepository: Repository<PhaseSeed>,
        @InjectRepository(Entrant)
        private readonly entrantRepository: Repository<Entrant>,
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

    async updateSeeding(phaseId: number, entrantIds: number[]): Promise<void> {
        const phase = await this.phaseRepository.findOne({
            where: { id: phaseId },
            relations: {
                division: true,
                seeds: {
                    entrant: true,
                },
            },
        });
        if (!phase) throw new NotFoundException(`Phase with ID ${phaseId} not found`);

        const entrants = entrantIds.length > 0
            ? await this.entrantRepository.find({
                where: entrantIds.map((entrantId) => ({
                    id: entrantId,
                    division: { id: phase.division.id },
                })),
            })
            : [];
        const entrantById = new Map(entrants.map((entrant) => [entrant.id, entrant]));
        const existingByEntrantId = new Map((phase.seeds ?? []).map((seed) => [seed.entrant.id, seed] as const));

        const stagedSeeds: PhaseSeed[] = [];
        const seenEntrantIds = new Set<number>();

        entrantIds.forEach((entrantId, index) => {
            const entrant = entrantById.get(entrantId);
            if (!entrant) {
                return;
            }

            const phaseSeed = existingByEntrantId.get(entrantId) ?? this.phaseSeedRepository.create({
                phase,
                entrant,
            });
            phaseSeed.seedNum = index + 1;
            stagedSeeds.push(phaseSeed);
            seenEntrantIds.add(entrantId);
        });

        if (stagedSeeds.length > 0) {
            await this.phaseSeedRepository.save(stagedSeeds);
        }

        const staleSeedIds = (phase.seeds ?? [])
            .filter((seed) => !seenEntrantIds.has(seed.entrant.id))
            .map((seed) => seed.id);
        if (staleSeedIds.length > 0) {
            await this.phaseSeedRepository.delete(staleSeedIds);
        }

        await this.uiUpdateGateway.emitDivisionUpdateByDivisionId(phase.division.id);
        await this.uiUpdateGateway.emitPhaseUpdateByPhaseId(phase.id);
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
