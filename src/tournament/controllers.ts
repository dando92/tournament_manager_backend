import { DivisionsController } from './controllers/divisions.controller';
import { PhasesController } from './controllers/phases.controller';
import { MatchesController } from '@match/controllers/matches.controller';
import { PlayersController } from '@player/players.controller';
import { RoundsController } from './controllers/rounds.controller';

import { TournamentsController } from './controllers/tournaments.controller';
import { ScoresController } from './controllers/scores.controller';
import { SongsController } from './controllers/songs.controller';
import { StandingsController } from './controllers/standings.controller';
import { SetupController } from './controllers/setup.controller';
import { MatchAssignmentController } from '@match/controllers/match_assignment.controller';
import { BracketController } from '@bracket/bracket.controller';

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
    BracketController,
];