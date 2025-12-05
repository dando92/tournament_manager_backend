import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { Score } from './score.entity'
import { Team } from './team.entity'
import { Match } from './match.entity';
import { MatchAssignment } from './match_assignment.entity';

@Entity()
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Score, (score) => score.player, { cascade: true })
  scores: Score[]

  @ManyToOne(() => Team, (team) => team.players, { orphanedRowAction: "nullify" })
  @JoinColumn()
  team: Team;

  @ManyToMany(() => Match, (match) => match.players)
  matches: Match[];

  @OneToMany(() => MatchAssignment, (matchAssignment) => matchAssignment.player, { eager: true })
  matchAssignments: MatchAssignment[];
}

