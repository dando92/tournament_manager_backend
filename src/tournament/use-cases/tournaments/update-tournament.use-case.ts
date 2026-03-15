import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';
import { UpdateTournamentDto } from '../../dtos';

@Injectable()
export class UpdateTournamentUseCase {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentsRepository: Repository<Tournament>,
    ) {}

    async execute(id: number, dto: UpdateTournamentDto): Promise<Tournament> {
        const existingTournament = await this.tournamentsRepository.findOne({ where: { id }, relations: ['helpers', 'owner'] });
        if (!existingTournament) throw new NotFoundException(`Tournament with id ${id} not found`);
        this.tournamentsRepository.merge(existingTournament, dto);
        return await this.tournamentsRepository.save(existingTournament);
    }
}
