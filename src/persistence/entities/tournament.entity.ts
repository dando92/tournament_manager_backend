import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { Division } from './division.entity';
import { Account } from './account.entity';
import { Song } from './song.entity';


@Entity()
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 'ws://syncservice.groovestats.com:1337' })
  syncstartUrl: string;

  @OneToMany(() => Division, (division) => division.tournament, { eager: true, cascade: true })
  divisions: Division[]

  @ManyToOne(() => Account, { nullable: true, eager: false })
  owner: Account;

  @ManyToMany(() => Account, { eager: false })
  @JoinTable()
  helpers: Account[];

  @OneToMany(() => Song, (song) => song.tournament, { eager: false })
  songs: Promise<Song[]>;
}
