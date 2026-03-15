import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  OneToMany, 
  ManyToOne,
  ManyToMany, 
  JoinTable,
  JoinColumn } from 'typeorm';
  
import { Phase } from './phase.entity'
import { Tournament } from './tournament.entity';
import { Player } from './player.entity';


@Entity()
export class Division {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  bracketType: string;

  @ManyToMany(() => Player, (player) => player.divisions, { eager: true})
  @JoinTable()
  players: Player[];

  @OneToMany(() => Phase, (phase) => phase.division, { eager: true, cascade: true  })
  phases: Phase[];

  @ManyToOne(() => Tournament, (tournament) => tournament.divisions, { onDelete: 'CASCADE' })
  @JoinColumn()
  tournament: Tournament;
}

