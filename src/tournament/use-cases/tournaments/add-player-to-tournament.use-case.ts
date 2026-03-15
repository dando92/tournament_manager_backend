import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, Player } from '@persistence/entities';

@Injectable()
export class AddPlayerToTournamentUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
        @InjectRepository(Player)
        private readonly playerRepository: Repository<Player>,
    ) {}

    async execute(tournamentId: number, playerId: number): Promise<void> {
        const tournament = await this.tournamentsRepository.findOne({
            where: { id: tournamentId },
            relations: ['players'],
        });
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        const player = await this.playerRepository.findOneBy({ id: playerId });
        if (!player) throw new NotFoundException(`Player ${playerId} not found`);

        const players = await tournament.players;
        if (!players.some(p => p.id === playerId)) {
            tournament.players = Promise.resolve([...players, player]);
            await this.tournamentsRepository.save(tournament);
        }
    }
}
