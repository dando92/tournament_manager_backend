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
import { ParticipantService } from './services/participant.service';
import { EntrantService } from './services/entrant.service';
import { PhaseService } from './services/phase.service';
import { SongService } from './services/song.service';
import { ScoreService } from './services/score.service';
import { RoundService } from './services/round.service';
import { UiUpdateContextService } from '@match/services/ui-update-context.service';

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
export { ParticipantService };
export { EntrantService };
export { PhaseService };
export { SongService };
export { ScoreService };
export { RoundService };
export { UiUpdateContextService };

export { StandingService };

export const Services = [
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
    ParticipantService,
    EntrantService,
    PhaseService,
    SongService,
    ScoreService,
    RoundService,
    UiUpdateContextService,

    TournamentService,
    TournamentManager,
];
