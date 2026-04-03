import { DivisionsController } from './controllers/divisions.controller';
import { PhasesController } from './controllers/phases.controller';
import { MatchesController } from '@match/controllers/matches.controller';
import { PlayersController } from '@player/players.controller';
import { TournamentsController } from './controllers/tournaments.controller';
import { SongsController } from './controllers/songs.controller';
import { StandingsController } from './controllers/standings.controller';
import { BracketController } from '@bracket/bracket.controller';

export const Controllers = [
    DivisionsController,
    PhasesController,
    MatchesController,
    PlayersController,
    TournamentsController,
    SongsController,
    StandingsController,
    BracketController,
];
