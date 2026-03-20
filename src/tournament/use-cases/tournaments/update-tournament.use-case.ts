import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';
import { UpdateTournamentDto } from '../../dtos';
import { LobbyManager } from '../../services/lobby-manager.service';

@Injectable()
export class UpdateTournamentUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
        private readonly lobbyManager: LobbyManager,
    ) {}

    async execute(id: number, dto: UpdateTournamentDto): Promise<Tournament> {
        const existing = await this.tournamentsRepository.findOne({ where: { id }, relations: ['helpers', 'owner'] });
        if (!existing) throw new NotFoundException(`Tournament with id ${id} not found`);
        const previousUrl = existing.syncstartUrl;
        this.tournamentsRepository.merge(existing, dto);
        const result = await this.tournamentsRepository.save(existing);
        if (dto.syncstartUrl !== undefined && dto.syncstartUrl !== previousUrl) {
            this.lobbyManager.OnTournamentUrlChanged(id, dto.syncstartUrl);
        }
        return result;
    }
}
