import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';

@Injectable()
export class RemovePlayerFromTournamentUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(tournamentId: number, playerId: number): Promise<void> {
        const tournament = await this.tournamentsRepository.findOne({
            where: { id: tournamentId },
            relations: ['players'],
        });
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const players = await tournament.players;
        tournament.players = Promise.resolve((players ?? []).filter(p => p.id !== playerId));
        await this.tournamentsRepository.save(tournament);
    }
}
