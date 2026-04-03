import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Account } from '@persistence/entities';
import { CreateTournamentDto, UpdateTournamentDto } from '../dtos';

export interface MyTournamentRoles {
    ownedTournamentIds: number[];
    helperTournamentIds: number[];
}

@Injectable()
export class TournamentService {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentRepository: Repository<Tournament>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) {}

    async create(dto: CreateTournamentDto, ownerId?: string): Promise<Tournament> {
        const tournament = new Tournament();
        tournament.name = dto.name;
        if (dto.syncstartUrl) tournament.syncstartUrl = dto.syncstartUrl;

        if (ownerId) {
            const owner = await this.accountRepository.findOneBy({ id: ownerId });
            if (owner) tournament.owner = owner;
        }

        return this.tournamentRepository.save(tournament);
    }

    async findAllPublic(): Promise<Tournament[]> {
        return this.tournamentRepository.find();
    }

    async findOne(id: number): Promise<Tournament | null> {
        return this.tournamentRepository.findOne({ where: { id }, relations: ['helpers', 'owner'] });
    }

    async update(id: number, dto: UpdateTournamentDto): Promise<{ tournament: Tournament; previousSyncstartUrl: string | undefined }> {
        const existing = await this.tournamentRepository.findOne({ where: { id }, relations: ['helpers', 'owner'] });
        if (!existing) throw new NotFoundException(`Tournament with id ${id} not found`);

        const previousSyncstartUrl = existing.syncstartUrl;

        if (dto.helpers !== undefined) {
            existing.helpers = dto.helpers;
        }

        this.tournamentRepository.merge(existing, { name: dto.name, syncstartUrl: dto.syncstartUrl });
        const tournament = await this.tournamentRepository.save(existing);
        return { tournament, previousSyncstartUrl };
    }

    async getMyRoles(accountId: string): Promise<MyTournamentRoles> {
        const owned = await this.tournamentRepository.find({
            where: { owner: { id: accountId } },
            select: ['id'],
        });

        const helped = await this.tournamentRepository
            .createQueryBuilder('tournament')
            .leftJoin('tournament.helpers', 'helper')
            .where('helper.id = :accountId', { accountId })
            .select('tournament.id')
            .getMany();

        return {
            ownedTournamentIds: owned.map(tournament => tournament.id),
            helperTournamentIds: helped.map(tournament => tournament.id),
        };
    }

    async findByPhase(phaseId: number): Promise<Tournament | null> {
        return this.tournamentRepository.findOne({ where: { divisions: { phases: { id: phaseId } } } });
    }
}
