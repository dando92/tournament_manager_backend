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
import { Player } from './player.entity';
import { Song } from './song.entity';


@Entity()
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Division, (division) => division.tournament, { eager: true, cascade: true })
  divisions: Division[]

  @ManyToOne(() => Account, { nullable: true, eager: false })
  owner: Account;

  @ManyToMany(() => Account, { eager: false })
  @JoinTable()
  helpers: Account[];

  @ManyToMany(() => Player, { eager: false })
  @JoinTable()
  players: Promise<Player[]>;

  @OneToMany(() => Song, (song) => song.tournament, { eager: false })
  songs: Promise<Song[]>;
}
