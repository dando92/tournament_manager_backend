import { IsNotEmpty, IsNumber, IsString, IsOptional, } from 'class-validator';
import { Type } from 'class-transformer';
import { Team }  from '../entities';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlayerDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Name of the player',
  })
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  name: string;

  @ApiProperty({
    example: 1,
    description: 'ID of the team the player belongs to',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teamId: number;
}

export class UpdatePlayerDto {
  @ApiProperty({
    example: 'Jane Doe',
    description: 'New name of the player',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  name: string;

  @ApiProperty({
    example: 2,
    description: 'New ID of the team the player belongs to',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teamId: number;

  team?: Team;
}
