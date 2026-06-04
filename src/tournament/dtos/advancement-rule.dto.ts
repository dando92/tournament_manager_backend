import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { AdvancementCompetitionKind } from '@persistence/entities';

const competitionKinds: AdvancementCompetitionKind[] = ['match', 'phase_group'];

export class CreateAdvancementRuleDto {
  @ApiProperty({ enum: competitionKinds, example: 'match' })
  @IsIn(competitionKinds)
  sourceKind: AdvancementCompetitionKind;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sourceId: number;

  @ApiProperty({ description: '1-based source result placement', example: 1 })
  @IsInt()
  @Min(1)
  sourcePlacement: number;

  @ApiProperty({ enum: competitionKinds, example: 'match' })
  @IsIn(competitionKinds)
  targetKind: AdvancementCompetitionKind;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  targetId: number;

  @ApiProperty({ description: '1-based target entrant or seed slot', example: 1 })
  @IsInt()
  @Min(1)
  targetSlot: number;
}

export class UpdateAdvancementRuleDto {
  @ApiProperty({ enum: competitionKinds, example: 'match', required: false })
  @IsOptional()
  @IsIn(competitionKinds)
  sourceKind?: AdvancementCompetitionKind;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  sourceId?: number;

  @ApiProperty({ description: '1-based source result placement', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  sourcePlacement?: number;

  @ApiProperty({ enum: competitionKinds, example: 'match', required: false })
  @IsOptional()
  @IsIn(competitionKinds)
  targetKind?: AdvancementCompetitionKind;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetId?: number;

  @ApiProperty({ description: '1-based target entrant or seed slot', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetSlot?: number;
}

export class MatchAdvancementRuleInputDto {
  @ApiProperty({ description: '1-based source result placement', example: 1 })
  @IsInt()
  @Min(1)
  sourcePlacement: number;

  @ApiProperty({ description: 'Target match id', example: 2 })
  @IsInt()
  @Min(1)
  targetId: number;

  @ApiProperty({ description: '1-based target entrant slot', example: 1 })
  @IsInt()
  @Min(1)
  targetSlot: number;
}

export class UpdateMatchAdvancementRulesDto {
  @ApiProperty({ type: [MatchAdvancementRuleInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchAdvancementRuleInputDto)
  rules: MatchAdvancementRuleInputDto[];
}
