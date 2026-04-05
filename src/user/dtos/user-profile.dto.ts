import { Account } from '@persistence/entities';

export class UserProfileDto {
    id: string;
    username: string;
    nationality: string;
    grooveStatsApi: string;
    profilePicture: string;
    player: Account['player'] | null;
}
