import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Division } from './division.entity';
import { Match } from './match.entity';
import { Participant } from './participant.entity';
import { PhaseSeed } from './phase_seed.entity';

export type EntrantType = 'player' | 'team';
export type EntrantStatus = 'active' | 'dropped' | 'withdrawn' | 'dq' | 'unknown';

@Entity()
export class Entrant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Division, (division) => division.entrants, { onDelete: 'CASCADE' })
  division: Division;

  @Column()
  name: string;

  @Column({ default: 'player' })
  type: EntrantType;

  @Column({ nullable: true, default: null })
  seedNum?: number | null;

  @Column({ default: 'active' })
  status: EntrantStatus;

  @ManyToMany(() => Participant, (participant) => participant.entrants)
  @JoinTable()
  participants: Participant[];

  @ManyToMany(() => Match, (match) => match.entrants)
  matches: Match[];

  @OneToMany(() => PhaseSeed, (phaseSeed) => phaseSeed.entrant)
  phaseSeeds: PhaseSeed[];
}
