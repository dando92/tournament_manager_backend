import {
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TournamentStaffDto {
    @ApiProperty({ example: 'd9c42b76-3c5f-4d2f-8f4c-32a2d93b24ff', description: 'Staff account id.' })
    id: string;

    @ApiProperty({ example: 'momo', description: 'Staff username.' })
    username: string;
}

export class TournamentResponseDto {
    @ApiProperty({ example: 1, description: 'Tournament id.' })
    id: number;

    @ApiProperty({ example: 'UEFA Euro 2024', description: 'The name of the tournament.' })
    name: string;

    @ApiProperty({
        description: 'WebSocket URL of the syncstart server for this tournament.',
        required: false,
        example: 'ws://syncservice.groovestats.com:1337',
    })
    syncstartUrl?: string;

    @ApiProperty({ type: () => [TournamentStaffDto], description: 'Tournament staff.' })
    staff: TournamentStaffDto[];
}

export class CreateTournamentDto {
    /**
     * The name of the tournament.
     * @example "UEFA Euro 2024"
     */
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'UEFA Euro 2024', description: 'The name of the tournament.' })
    name: string;

    @IsOptional()
    @IsString()
    @ApiProperty({ description: 'WebSocket URL of the syncstart server for this tournament.', required: false })
    syncstartUrl?: string;
}

export class UpdateTournamentDto {
    /**
     * The name of the tournament.
     * @example "UEFA Euro 2024"
     */
    @IsOptional()
    @IsString()
    @ApiProperty({ example: 'UEFA Euro 2024', description: 'The name of the tournament.', required: false })
    name?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({ description: 'WebSocket URL of the syncstart server for this tournament.', required: false })
    syncstartUrl?: string;
}
