import { Body, Controller, Post } from '@nestjs/common';
import { Division } from '@persistence/entities';
import { GenerateBracketUseCase, GenerateBracketDto } from '../use-cases/divisions/generate-bracket.use-case';

@Controller('matchmanager')
export class MatchManagerController {
    constructor(private readonly generateBracketUseCase: GenerateBracketUseCase) {}

    @Post()
    async GenerateBracket(@Body() dto: GenerateBracketDto): Promise<Division> {
        return this.generateBracketUseCase.execute(dto);
    }
}
