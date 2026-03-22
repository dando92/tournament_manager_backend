import { Injectable } from '@nestjs/common';
import { Division } from '@persistence/entities';
import { CreateTournamentDto } from '../../dtos';
import { BracketSystemProvider } from '../../services/bracket-systems/BracketSystemProvider';
import { CreateTournamentUseCase } from '../tournaments/create-tournament.use-case';

export class GenerateBracketDto {
    tournamentName: string;
    divisionName: string;
    bracketType: string;
    playerPerMatch: number;
}

@Injectable()
export class GenerateBracketUseCase {
    constructor(
        private readonly createTournamentUseCase: CreateTournamentUseCase,
        private readonly bracketSystemProvider: BracketSystemProvider,
    ) {}

    async execute(dto: GenerateBracketDto): Promise<Division> {
        const tournamentDto = new CreateTournamentDto();
        tournamentDto.name = dto.tournamentName;
        const tournament = await this.createTournamentUseCase.execute(tournamentDto);

        const division = await this.bracketSystemProvider
            .getBracketSystem(dto.bracketType)
            .create(dto.divisionName, tournament.id, dto.playerPerMatch);

        return division;
    }
}
