import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';

import { Match } from './match.entity';
import { Division } from './division.entity';
import { PhaseGroup } from './phase-group.entity';

@Entity()
export class Phase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Match, (match) => match.phase, { cascade: true })
  matches: Match[];

  @OneToMany(() => PhaseGroup, (phaseGroup) => phaseGroup.phase, { cascade: true })
  phaseGroups: PhaseGroup[];

  @ManyToOne(() => Division, (division) => division.phases, { onDelete: 'CASCADE' })
  division: Division;
}
