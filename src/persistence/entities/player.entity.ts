import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
  OneToOne } from 'typeorm';

import { Score } from './score.entity'
import { Match } from './match.entity';
import { MatchAssignment } from './match_assignment.entity';
import { Division } from './division.entity';
import { Account } from './account.entity';

@Entity()
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  playerName: string;

  @OneToOne(() => Account, (account) => account.player)
  account: Account;

  @OneToMany(() => Score, (score) => score.player, { cascade: true })
  scores: Score[];

  @ManyToMany(() => Match, (match) => match.players)
  matches: Match[];

  @ManyToMany(() => Division, (division) => division.players)
  divisions: Division[];

  @OneToMany(() => MatchAssignment, (matchAssignment) => matchAssignment.player)
  matchAssignments: MatchAssignment[];
}
