import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Match } from './match.entity';
import { Phase } from './phase.entity';

export type PhaseGroupMode = 'set-driven' | 'progression-driven';

@Entity()
export class PhaseGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 'set-driven' })
  mode: PhaseGroupMode;

  @ManyToOne(() => Phase, (phase) => phase.phaseGroups, { onDelete: 'CASCADE' })
  @JoinColumn()
  phase: Phase;

  @OneToMany(() => Match, (match) => match.phaseGroup, { cascade: true })
  matches: Match[];
}
