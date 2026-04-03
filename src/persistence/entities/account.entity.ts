import { Entity,
        Column,
        PrimaryGeneratedColumn,
        OneToOne,
        JoinColumn } from 'typeorm';

import { Player } from './player.entity';


@Entity()
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    username: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({ default: "" })
    grooveStatsApi: string;

    @Column({ default: false })
    isAdmin: boolean;

    @Column({ default: false })
    isTournamentCreator: boolean;

    @Column({ default: "" })
    nationality: string;

    @Column({ type: 'text', default: "" })
    profilePicture: string;

    @OneToOne(() => Player)
    @JoinColumn()
    player: Player
}
