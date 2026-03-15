import { Body, Controller, Delete, Get, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { Division } from '@persistence/entities';
import { BracketSystemProvider } from '../services/bracket-systems/BracketSystemProvider';
import { CreateTournamentUseCase } from '../use-cases/tournaments/create-tournament.use-case';
import { CreateTournamentDto } from '@tournament/dtos';

@Controller('matchmanager')
export class MatchManagerController {
    constructor(private readonly provider: BracketSystemProvider,
        private readonly createTournamentUseCase: CreateTournamentUseCase
    ) { }

    @Post()
    async GenerateBracket() : Promise<Division> {
        const players: string[] = Array.from({ length: 16 }, (_, i) => `Player ${i + 1}`);
        const dto = new CreateTournamentDto();
        dto.name = "Magic";
        const tournament = await this.createTournamentUseCase.execute(dto);
        const division = await this.provider.getBracketSystem("DoubleElimination").create("FirstTry", tournament.id, players, 2);
        return division;
    }
}
