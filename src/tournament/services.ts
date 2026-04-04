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
import { PhaseService } from './services/phase.service';

// Round use cases
import { CreateRoundUseCase } from './use-cases/rounds/create-round.use-case';
import { UpdateRoundUseCase } from './use-cases/rounds/update-round.use-case';
import { DeleteRoundUseCase } from './use-cases/rounds/delete-round.use-case';

// Score use cases
import { CreateScoreUseCase } from './use-cases/scores/create-score.use-case';
import { GetScoresBySongUseCase } from './use-cases/scores/get-scores-by-song.use-case';
import { UpdateScoreUseCase } from './use-cases/scores/update-score.use-case';

// Song use cases
import { CreateSongUseCase } from './use-cases/songs/create-song.use-case';
import { DeleteSongUseCase } from './use-cases/songs/delete-song.use-case';

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
export { PhaseService };

export { CreateRoundUseCase };
export { UpdateRoundUseCase };
export { DeleteRoundUseCase };

export { CreateScoreUseCase };
export { GetScoresBySongUseCase };
export { UpdateScoreUseCase };

export { CreateSongUseCase };
export { DeleteSongUseCase };

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
    PhaseService,

    // Round use cases
    CreateRoundUseCase,
    UpdateRoundUseCase,
    DeleteRoundUseCase,

    // Score use cases
    CreateScoreUseCase,
    GetScoresBySongUseCase,
    UpdateScoreUseCase,

    // Song use cases
    CreateSongUseCase,
    DeleteSongUseCase,

    TournamentService,
    TournamentManager,
];
