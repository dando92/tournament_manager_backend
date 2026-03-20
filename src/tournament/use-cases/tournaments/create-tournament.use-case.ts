import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Account } from '@persistence/entities';
import { CreateTournamentDto } from '../../dtos';
import { LobbyManager } from '../../services/lobby-manager.service';

@Injectable()
export class CreateTournamentUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        private readonly lobbyManager: LobbyManager,
    ) {}

    async execute(dto: CreateTournamentDto, ownerId?: string): Promise<Tournament> {
        const newTournament = new Tournament();
        newTournament.name = dto.name;
        if (dto.syncstartUrl) newTournament.syncstartUrl = dto.syncstartUrl;

        if (ownerId) {
            const owner = await this.accountRepository.findOneBy({ id: ownerId });
            if (owner) newTournament.owner = owner;
        }

        await this.tournamentsRepository.save(newTournament);

        if (dto.syncstartUrl) {
            this.lobbyManager.OnTournamentCreated(newTournament.id, dto.syncstartUrl);
        }

        return newTournament;
    }
}
