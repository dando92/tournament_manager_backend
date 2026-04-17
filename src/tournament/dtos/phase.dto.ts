import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PhaseType } from '@persistence/entities';

export class CreatePhaseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  divisionId: number;

  @IsOptional()
  @IsString()
  type?: PhaseType;
}

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: PhaseType;
}

export class UpdatePhaseSeedingDto {
  @IsArray()
  @Type(() => Number)
  entrantIds: number[];
}
