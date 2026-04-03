import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BracketManager } from '@bracket/bracket.manager';

@Controller('bracket')
export class BracketController {
    constructor(
        private readonly bracketManager: BracketManager,
    ) {}

    @Get('bracket-types')
    getBracketTypes(): string[] {
        return this.bracketManager.getBracketTypes();
    }

    @Post('divisions/:divisionId/generate-bracket')
    async generateBracket(
        @Param('divisionId') divisionId: number,
        @Body() body: { bracketType: string; playerPerMatch?: number },
    ) {
        const playerPerMatch = body.playerPerMatch ?? 2;
        await this.bracketManager.generateForDivision(Number(divisionId), body.bracketType, playerPerMatch);
        return { success: true };
    }
}
