import { UserService } from '../user/services/user.service';
import { MatchManager } from "@match/services/match.manager";
import { MatchService } from "@match/services/match.service";
import { SongRoller } from "./services/song.roller";
import { StandingManager } from "./standing/standing.manager";
import { StandingService } from "./standing/standing.service";
import { ScoringSystemProvider } from "./services/scoring-systems/ScoringSystemProvider";
import { BracketSystemProvider } from "@bracket/BracketSystemProvider";
import { BracketManager } from "@bracket/bracket.manager";
import { LobbyManager } from "./services/lobby-manager.service";
import { TournamentService } from "./services/tournament.service";
import { TournamentManager } from "./services/tournament.manager";
import { PlayerService } from "@player/player.service";
import { PlayerManager } from "@player/player.manager";
import { DivisionService } from './services/division.service';
import { DivisionManager } from './services/division.manager';
import { PhaseService } from './services/phase.service';
import { SongService } from './services/song.service';
import { ScoreService } from './services/score.service';
import { RoundService } from './services/round.service';
import { UiUpdateContextService } from '@match/services/ui-update-context.service';

export { UserService as AccountService };
export { MatchManager };
export { MatchService };
export { SongRoller };
export { StandingManager };
export { ScoringSystemProvider };
export { BracketSystemProvider };
export { BracketManager };
export { LobbyManager };
export { TournamentService };
export { TournamentManager };
export { PlayerService };
export { PlayerManager };
export { DivisionService };
export { DivisionManager };
export { PhaseService };
export { SongService };
export { ScoreService };
export { RoundService };
export { UiUpdateContextService };

export { StandingService };

export const Services = [
    UserService,
    MatchService,
    MatchManager,
    SongRoller,
    StandingManager,
    StandingService,
    ScoringSystemProvider,
    BracketSystemProvider,
    BracketManager,
    LobbyManager,
    PlayerService,
    PlayerManager,

    DivisionService,
    DivisionManager,
    PhaseService,
    SongService,
    ScoreService,
    RoundService,
    UiUpdateContextService,

    TournamentService,
    TournamentManager,
];
