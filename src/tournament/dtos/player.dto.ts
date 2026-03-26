import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlayerDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Name of the player',
  })
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  playerName: string;

  @ApiProperty({ required: false, description: 'Division to link player to after creation' })
  @IsOptional()
  @IsNumber()
  divisionId?: number;
}

export class BulkAddPlayersToDivisionDto {
  @ApiProperty({ type: [String], description: 'List of player names to add to the division' })
  @IsArray()
  @IsString({ each: true })
  playerNames: string[];
}

export class UpdatePlayerDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Name of the player',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  playerName?: string;
}
