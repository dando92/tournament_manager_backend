import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Entrant } from './entrant.entity';
import { Phase } from './phase.entity';

@Entity()
@Unique(['phase', 'entrant'])
export class PhaseSeed {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Phase, (phase) => phase.seeds, { onDelete: 'CASCADE' })
  @JoinColumn()
  phase: Phase;

  @ManyToOne(() => Entrant, (entrant) => entrant.phaseSeeds, { onDelete: 'CASCADE' })
  @JoinColumn()
  entrant: Entrant;

  @Column()
  seedNum: number;
}
