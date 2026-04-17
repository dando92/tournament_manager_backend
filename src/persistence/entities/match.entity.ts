import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';

import { Round } from './round.entity';
import { PhaseGroup } from './phase_group.entity';
import { Entrant } from './entrant.entity';
import { MatchResult } from './match_result.entity';


@Entity()
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ nullable: true })
  notes: string;

  @Column({
    type: 'simple-array',
    nullable: true,
    transformer: {
      to: (value: number[]) => value,
      from: (value: string | number[]) => Array.isArray(value) ? value.map(Number) : (value ? value.split(',').map(Number) : []),
    },
  })
  targetPaths: number[];

  @Column({
    type: 'simple-array',
    nullable: true,
    transformer: {
      to: (value: number[]) => value,
      from: (value: string | number[]) => Array.isArray(value) ? value.map(Number) : (value ? value.split(',').map(Number) : []),
    },
  })
  sourcePaths: number[];

  @Column()
  scoringSystem: string;

  @ManyToMany(() => Entrant, (entrant) => entrant.matches, { nullable: true })
  @JoinTable()
  entrants?: Entrant[];

  @OneToMany(() => Round, (round) => round.match, { cascade: true })
  rounds: Round[];

  @OneToOne(() => MatchResult, (matchResult) => matchResult.match, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  @JoinColumn()
  matchResult?: MatchResult | null;

  @ManyToOne(() => PhaseGroup, (phaseGroup) => phaseGroup.matches, { onDelete: 'CASCADE' })
  @JoinColumn()
  phaseGroup: Promise<PhaseGroup>;
}
