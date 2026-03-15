import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
