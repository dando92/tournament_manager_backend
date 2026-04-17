import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';

import { Division } from './division.entity';
import { PhaseGroup } from './phase_group.entity';
import { PhaseSeed } from './phase_seed.entity';

export type PhaseType = 'pool' | 'bracket';

@Entity()
export class Phase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 'bracket' })
  type: PhaseType;

  @OneToMany(() => PhaseGroup, (phaseGroup) => phaseGroup.phase, { cascade: true })
  phaseGroups: PhaseGroup[];

  @OneToMany(() => PhaseSeed, (seed) => seed.phase, { cascade: true })
  seeds: PhaseSeed[];

  @ManyToOne(() => Division, (division) => division.phases, { onDelete: 'CASCADE' })
  division: Division;
}
