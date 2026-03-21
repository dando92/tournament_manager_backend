import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn } from 'typeorm';

import { Match } from './match.entity'
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

  @ManyToMany(() => Player, (player) => player.divisions, { eager: true})
  @JoinTable()
  players: Player[];

  @OneToMany(() => Match, (match) => match.division, { eager: true, cascade: true })
  matches: Match[];

  @ManyToOne(() => Tournament, (tournament) => tournament.divisions, { onDelete: 'CASCADE' })
  @JoinColumn()
  tournament: Tournament;
}
