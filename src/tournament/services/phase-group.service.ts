import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entrant, Phase, PhaseGroup, PhaseGroupEntrant } from '@persistence/entities';

@Injectable()
export class PhaseGroupService {
    constructor(
        @InjectRepository(PhaseGroup)
        private readonly phaseGroupRepository: Repository<PhaseGroup>,
        @InjectRepository(PhaseGroupEntrant)
        private readonly phaseGroupEntrantRepository: Repository<PhaseGroupEntrant>,
        @InjectRepository(Phase)
        private readonly phaseRepository: Repository<Phase>,
        @InjectRepository(Entrant)
        private readonly entrantRepository: Repository<Entrant>,
    ) {}

    async createDefaultForPhase(phase: Phase, bracketType?: string | null): Promise<PhaseGroup> {
        const existing = await this.findDefaultForPhase(phase.id);
        if (existing) return existing;

        const phaseGroup = new PhaseGroup();
        phaseGroup.name = phase.name;
        phaseGroup.displayIdentifier = '1';
        phaseGroup.bracketType = bracketType ?? null;
        phaseGroup.state = 'pending';
        phaseGroup.phase = phase;
        phaseGroup.entrants = [];
        return this.phaseGroupRepository.save(phaseGroup);
    }

    async findDefaultForPhase(phaseId: number): Promise<PhaseGroup | null> {
        return this.phaseGroupRepository.findOne({
            where: { phase: { id: phaseId } },
            order: { id: 'ASC' },
        });
    }

    async findOne(id: number): Promise<PhaseGroup | null> {
        return this.phaseGroupRepository.findOne({
            where: { id },
            relations: {
                phase: true,
                entrants: {
                    entrant: {
                        participants: {
                            player: true,
                        },
                    },
                },
                matches: true,
            },
        });
    }

    async findOrCreateDefaultForPhaseId(phaseId: number, bracketType?: string | null): Promise<PhaseGroup> {
        const existing = await this.findDefaultForPhase(phaseId);
        if (existing) return existing;

        const phase = await this.phaseRepository.findOneBy({ id: phaseId });
        if (!phase) throw new NotFoundException(`Phase with ID ${phaseId} not found`);
        return this.createDefaultForPhase(phase, bracketType);
    }

    async replaceEntrants(phaseGroupId: number, entrants: Entrant[]): Promise<void> {
        const phaseGroup = await this.phaseGroupRepository.findOneBy({ id: phaseGroupId });
        if (!phaseGroup) throw new NotFoundException(`PhaseGroup with ID ${phaseGroupId} not found`);

        await this.phaseGroupEntrantRepository.delete({ phaseGroup: { id: phaseGroupId } });

        for (const [index, entrant] of entrants.entries()) {
            const loadedEntrant = await this.entrantRepository.findOneBy({ id: entrant.id });
            if (!loadedEntrant) throw new NotFoundException(`Entrant with ID ${entrant.id} not found`);

            const phaseGroupEntrant = new PhaseGroupEntrant();
            phaseGroupEntrant.phaseGroup = phaseGroup;
            phaseGroupEntrant.entrant = loadedEntrant;
            phaseGroupEntrant.seedNum = index + 1;
            phaseGroupEntrant.slot = index + 1;
            phaseGroupEntrant.status = 'active';
            await this.phaseGroupEntrantRepository.save(phaseGroupEntrant);
        }
    }
}
