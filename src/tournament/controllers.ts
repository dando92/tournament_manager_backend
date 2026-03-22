import { DivisionsController } from './controllers/divisions.controller';
import { PhasesController } from './controllers/phases.controller';
import { MatchesController } from './controllers/matches.controller';
import { PlayersController } from './controllers/players.controller';
import { RoundsController } from './controllers/rounds.controller';

import { TournamentsController } from './controllers/tournaments.controller';
import { ScoresController } from './controllers/scores.controller';
import { SongsController } from './controllers/songs.controller';
import { StandingsController } from './controllers/standings.controller';
import { SetupController } from './controllers/setup.controller';
import { MatchAssignmentController } from './controllers/match_assignment.controller';
import { MatchOperationsController } from './controllers/match-operations.controller';
import { MatchManagerController } from './controllers/match-manager-controller';

export const Controllers = [
    DivisionsController,
    PhasesController,
    MatchesController,
    RoundsController,

    PlayersController,
    TournamentsController,
    ScoresController,
    SongsController,
    StandingsController,
    SetupController,
    MatchAssignmentController,
    MatchManagerController,
    MatchOperationsController,
];