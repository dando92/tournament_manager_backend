import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Entrant, Participant } from '@persistence/entities';

@Injectable()
export class EntrantService {
    constructor(
        @InjectRepository(Entrant)
        private readonly entrantRepository: Repository<Entrant>,
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        @InjectRepository(Participant)
        private readonly participantRepository: Repository<Participant>,
    ) {}

    async addSinglesEntrant(divisionId: number, participantId: number, seedNum?: number | null): Promise<Entrant> {
        const existing = await this.entrantRepository
            .createQueryBuilder('entrant')
            .leftJoinAndSelect('entrant.participants', 'participant')
            .leftJoinAndSelect('participant.player', 'player')
            .where('entrant.divisionId = :divisionId', { divisionId })
            .andWhere('participant.id = :participantId', { participantId })
            .getOne();

        if (existing) {
            if (existing.status !== 'active') existing.status = 'active';
            if (seedNum !== undefined) existing.seedNum = seedNum;
            return this.entrantRepository.save(existing);
        }

        const division = await this.divisionRepository.findOneBy({ id: divisionId });
        if (!division) throw new NotFoundException(`Division ${divisionId} not found`);

        const participant = await this.participantRepository.findOne({
            where: { id: participantId },
            relations: { player: true },
        });
        if (!participant) throw new NotFoundException(`Participant ${participantId} not found`);

        const entrant = new Entrant();
        entrant.division = division;
        entrant.name = participant.player.playerName;
        entrant.type = 'player';
        entrant.seedNum = seedNum ?? await this.getNextSeedNum(divisionId);
        entrant.status = 'active';
        entrant.participants = [participant];
        return this.entrantRepository.save(entrant);
    }

    async removeSinglesEntrantByPlayer(divisionId: number, playerId: number): Promise<void> {
        const entrant = await this.entrantRepository
            .createQueryBuilder('entrant')
            .leftJoinAndSelect('entrant.participants', 'participant')
            .leftJoinAndSelect('participant.player', 'player')
            .where('entrant.divisionId = :divisionId', { divisionId })
            .andWhere('player.id = :playerId', { playerId })
            .getOne();

        if (!entrant) return;
        entrant.status = 'withdrawn';
        await this.entrantRepository.save(entrant);
    }

    async updateSeeding(divisionId: number, entrantIds: number[]): Promise<void> {
        const entrants = await this.entrantRepository.find({
            where: { division: { id: divisionId } },
        });
        const order = new Map(entrantIds.map((id, index) => [Number(id), index + 1]));
        for (const entrant of entrants) {
            if (order.has(entrant.id)) {
                entrant.seedNum = order.get(entrant.id);
                await this.entrantRepository.save(entrant);
            }
        }
    }

    private async getNextSeedNum(divisionId: number): Promise<number> {
        const { max } = await this.entrantRepository
            .createQueryBuilder('entrant')
            .select('MAX(entrant.seedNum)', 'max')
            .where('entrant.divisionId = :divisionId', { divisionId })
            .getRawOne<{ max: number | null }>();
        return Number(max ?? 0) + 1;
    }
}
