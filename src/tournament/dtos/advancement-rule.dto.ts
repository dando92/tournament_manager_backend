import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
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
