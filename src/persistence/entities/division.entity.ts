import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn } from 'typeorm';

import { Phase } from './phase.entity';
import { Tournament } from './tournament.entity';
import { Player } from './player.entity';


@Entity()
export class Division {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true, default: null })
  playersPerMatch: number | null;

  @Column({ type: 'simple-json', nullable: true, default: null })
  seeding: number[] | null;

  @ManyToMany(() => Player, (player) => player.divisions)
  @JoinTable()
  players: Player[];

  @OneToMany(() => Phase, (phase) => phase.division, { cascade: true })
  phases: Phase[];

  @ManyToOne(() => Tournament, (tournament) => tournament.divisions, { onDelete: 'CASCADE' })
  @JoinColumn()
  tournament: Tournament;
}
