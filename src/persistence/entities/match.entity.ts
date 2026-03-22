import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn } from 'typeorm';

import { Round } from './round.entity'
import { Division } from './division.entity'
import { Player } from './player.entity'


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

  @Column({type: 'simple-array', nullable: true })
  targetPaths: number[];

  @Column({type: 'simple-array', nullable: true })
  sourcePaths: number[];

  @Column()
  scoringSystem: string;

  @ManyToMany(() => Player, (player) => player.matches, { nullable: true, eager: true})
  @JoinTable()
  players?: Player[];

  @OneToMany(() => Round, (round) => round.match, { eager: true, cascade: true  })
  rounds: Round[];

  @ManyToOne(() => Division, (division) => division.matches, { onDelete: 'CASCADE' })
  @JoinColumn()
  division: Promise<Division>;
}
