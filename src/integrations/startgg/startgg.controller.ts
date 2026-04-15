import { Body, Controller, Post, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards';
import { StartggImportDto, StartggImportPreviewDto } from './startgg.dto';
import { StartggService } from './startgg.service';

@Controller('integrations/startgg')
export class StartggController {
    constructor(private readonly startggService: StartggService) {}

    @UseGuards(JwtAuthGuard)
    @Post('import-preview')
    async previewImport(
        @Body(new ValidationPipe()) dto: StartggImportPreviewDto,
        @Request() req,
    ) {
        return this.startggService.previewImport(dto, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Post('import')
    async importEvent(
        @Body(new ValidationPipe()) dto: StartggImportDto,
        @Request() req,
    ) {
        return this.startggService.importEvent(dto, req.user);
    }
}
