import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';

import { Division } from './division.entity';
import { Song } from './song.entity';
import { Participant } from './participant.entity';


@Entity()
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 'ws://syncservice.groovestats.com:1337' })
  syncstartUrl: string;

  @OneToMany(() => Division, (division) => division.tournament, { cascade: true })
  divisions: Division[]

  @OneToMany(() => Participant, (participant) => participant.tournament, { cascade: true })
  participants: Participant[];


  @OneToMany(() => Song, (song) => song.tournament, { eager: false })
  songs: Promise<Song[]>;
}
