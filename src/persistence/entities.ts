import { Division } from './entities/division.entity';
import { Match } from './entities/match.entity';
import { Player } from './entities/player.entity';
import { Round } from './entities/round.entity';

import { Tournament } from './entities/tournament.entity';
import { Score } from './entities/score.entity';
import { Song } from './entities/song.entity';
import { Standing } from './entities/standing.entity';
import { MatchAssignment } from './entities/match_assignment.entity';
import { Setup } from './entities/setup.entity';
import { Account } from './entities/account.entity';

export { Division }
export { Match }
export { Player }
export { Round }

export { Tournament }
export { Score }
export { Song }
export { Standing }
export { MatchAssignment }
export { Setup }
export { Account }

export const Entities = [
    Division,
    Match,
    Player,
    Round,

    Tournament,
    Score,
    Song,
    Standing,
    MatchAssignment,
    Setup,
    Account
];