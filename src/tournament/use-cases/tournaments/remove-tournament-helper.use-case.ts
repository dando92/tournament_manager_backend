import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';

@Injectable()
export class RemoveTournamentHelperUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(tournamentId: number, accountId: string): Promise<Tournament> {
        const tournament = await this.tournamentsRepository.findOne({
            where: { id: tournamentId },
            relations: ['helpers'],
        });
        if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

        tournament.helpers = (tournament.helpers ?? []).filter(h => h.id !== accountId);
        return this.tournamentsRepository.save(tournament);
    }
}
