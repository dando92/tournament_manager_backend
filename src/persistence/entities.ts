import { Division } from './entities/division.entity';
import { Phase } from './entities/phase.entity';
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
import { Participant } from './entities/participant.entity';
import { Entrant } from './entities/entrant.entity';
import { ExternalMapping } from './entities/external_mapping.entity';
export type { ParticipantRole, ParticipantStatus } from './entities/participant.entity';
export type { EntrantType, EntrantStatus } from './entities/entrant.entity';
export type {
    ExternalProvider,
    ExternalMappingLocalType,
    ExternalMappingExternalType,
} from './entities/external_mapping.entity';

export { Division }
export { Phase }
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
export { Participant }
export { Entrant }
export { ExternalMapping }

export const Entities = [
    Division,
    Phase,
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
    ,Participant
    ,Entrant
    ,ExternalMapping
];
