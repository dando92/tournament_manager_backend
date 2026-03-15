import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Player } from '@persistence/entities';

@Injectable()
export class GetTournamentPlayersUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(tournamentId: number): Promise<Player[]> {
        const tournament = await this.tournamentsRepository.findOne({
            where: { id: tournamentId },
            relations: ['players'],
        });
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);
        return tournament.players ?? [];
    }
}
