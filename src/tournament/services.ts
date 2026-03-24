import { UserService } from '../user/services/user.service';
import { MatchManager } from "./services/match.manager";
import { PadRoller } from "./services/pad.roller";
import { SongRoller } from "./services/song.roller";
import { StandingManager } from "./services/standing.manager";
import { ScoringSystemProvider } from "./services/scoring-systems/ScoringSystemProvider";
import { BracketSystemProvider } from "./services/bracket-systems/BracketSystemProvider";
import { LobbyManager } from "./services/lobby-manager.service";

// Division use cases
import { CreateDivisionUseCase } from './use-cases/divisions/create-division.use-case';
import { GetDivisionsUseCase } from './use-cases/divisions/get-divisions.use-case';
import { GetDivisionUseCase } from './use-cases/divisions/get-division.use-case';
import { UpdateDivisionUseCase } from './use-cases/divisions/update-division.use-case';
import { DeleteDivisionUseCase } from './use-cases/divisions/delete-division.use-case';
import { GenerateBracketUseCase } from './use-cases/divisions/generate-bracket.use-case';

// Match use cases
import { CreateMatchUseCase } from './use-cases/matches/create-match.use-case';
import { GetMatchesUseCase } from './use-cases/matches/get-matches.use-case';
import { GetMatchUseCase } from './use-cases/matches/get-match.use-case';
import { UpdateMatchUseCase } from './use-cases/matches/update-match.use-case';
import { DeleteMatchUseCase } from './use-cases/matches/delete-match.use-case';
import { RemovePlayersFromMatchUseCase } from './use-cases/matches/remove-players-from-match.use-case';

// Player use cases
import { CreatePlayerUseCase } from './use-cases/players/create-player.use-case';
import { GetPlayersUseCase } from './use-cases/players/get-players.use-case';
import { GetPlayerUseCase } from './use-cases/players/get-player.use-case';
import { GetPlayerByNameUseCase } from './use-cases/players/get-player-by-name.use-case';
import { UpdatePlayerUseCase } from './use-cases/players/update-player.use-case';
import { DeletePlayerUseCase } from './use-cases/players/delete-player.use-case';

// Round use cases
import { CreateRoundUseCase } from './use-cases/rounds/create-round.use-case';
import { GetRoundsUseCase } from './use-cases/rounds/get-rounds.use-case';
import { GetRoundUseCase } from './use-cases/rounds/get-round.use-case';
import { UpdateRoundUseCase } from './use-cases/rounds/update-round.use-case';
import { DeleteRoundUseCase } from './use-cases/rounds/delete-round.use-case';

// Score use cases
import { CreateScoreUseCase } from './use-cases/scores/create-score.use-case';
import { GetScoresUseCase } from './use-cases/scores/get-scores.use-case';
import { GetScoreUseCase } from './use-cases/scores/get-score.use-case';
import { GetScoresBySongUseCase } from './use-cases/scores/get-scores-by-song.use-case';
import { UpdateScoreUseCase } from './use-cases/scores/update-score.use-case';
import { DeleteScoreUseCase } from './use-cases/scores/delete-score.use-case';

// Song use cases
import { CreateSongUseCase } from './use-cases/songs/create-song.use-case';
import { GetSongsUseCase } from './use-cases/songs/get-songs.use-case';
import { GetSongUseCase } from './use-cases/songs/get-song.use-case';
import { GetSongByNameUseCase } from './use-cases/songs/get-song-by-name.use-case';
import { UpdateSongUseCase } from './use-cases/songs/update-song.use-case';
import { DeleteSongUseCase } from './use-cases/songs/delete-song.use-case';

// Standing use cases
import { CreateStandingUseCase } from './use-cases/standings/create-standing.use-case';
import { GetStandingsUseCase } from './use-cases/standings/get-standings.use-case';
import { GetStandingUseCase } from './use-cases/standings/get-standing.use-case';
import { UpdateStandingUseCase } from './use-cases/standings/update-standing.use-case';
import { DeleteStandingUseCase } from './use-cases/standings/delete-standing.use-case';

// Setup use cases
import { CreateSetupUseCase } from './use-cases/setups/create-setup.use-case';
import { GetSetupsUseCase } from './use-cases/setups/get-setups.use-case';
import { GetSetupUseCase } from './use-cases/setups/get-setup.use-case';
import { UpdateSetupUseCase } from './use-cases/setups/update-setup.use-case';
import { DeleteSetupUseCase } from './use-cases/setups/delete-setup.use-case';

// MatchAssignment use cases
import { CreateMatchAssignmentUseCase } from './use-cases/match-assignments/create-match-assignment.use-case';
import { GetMatchAssignmentsUseCase } from './use-cases/match-assignments/get-match-assignments.use-case';
import { GetMatchAssignmentUseCase } from './use-cases/match-assignments/get-match-assignment.use-case';
import { UpdateMatchAssignmentUseCase } from './use-cases/match-assignments/update-match-assignment.use-case';
import { DeleteMatchAssignmentUseCase } from './use-cases/match-assignments/delete-match-assignment.use-case';

// Tournament use cases
import { CreateTournamentUseCase } from './use-cases/tournaments/create-tournament.use-case';
import { GetTournamentsUseCase } from './use-cases/tournaments/get-tournaments.use-case';
import { GetPublicTournamentsUseCase } from './use-cases/tournaments/get-public-tournaments.use-case';
import { GetTournamentUseCase } from './use-cases/tournaments/get-tournament.use-case';
import { UpdateTournamentUseCase } from './use-cases/tournaments/update-tournament.use-case';
import { DeleteTournamentUseCase } from './use-cases/tournaments/delete-tournament.use-case';
import { AssignTournamentHelperUseCase } from './use-cases/tournaments/assign-tournament-helper.use-case';
import { RemoveTournamentHelperUseCase } from './use-cases/tournaments/remove-tournament-helper.use-case';
import { GetTournamentPlayersUseCase } from './use-cases/tournaments/get-tournament-players.use-case';
import { AddPlayerToTournamentUseCase } from './use-cases/tournaments/add-player-to-tournament.use-case';
import { RemovePlayerFromTournamentUseCase } from './use-cases/tournaments/remove-player-from-tournament.use-case';
import { GetTournamentSongsUseCase } from './use-cases/tournaments/get-tournament-songs.use-case';
import { AddSongToTournamentUseCase } from './use-cases/tournaments/add-song-to-tournament.use-case';
import { RemoveSongFromTournamentUseCase } from './use-cases/tournaments/remove-song-from-tournament.use-case';
import { GetPlayerTournamentsUseCase } from './use-cases/tournaments/get-player-tournaments.use-case';
import { IsHelperOfAnyUseCase } from './use-cases/tournaments/is-helper-of-any.use-case';
import { GetMyTournamentRolesUseCase } from './use-cases/tournaments/get-my-tournament-roles.use-case';
import { GetTournamentByDivisionUseCase } from './use-cases/tournaments/get-tournament-by-division.use-case';
import { GetTournamentByPhaseUseCase } from './use-cases/tournaments/get-tournament-by-phase.use-case';
import { GetLobbiesUseCase } from './use-cases/tournaments/get-lobbies.use-case';
import { ConnectLobbyUseCase } from './use-cases/tournaments/connect-lobby.use-case';
import { DisconnectLobbyUseCase } from './use-cases/tournaments/disconnect-lobby.use-case';

// Phase use cases
import { CreatePhaseUseCase } from './use-cases/phases/create-phase.use-case';
import { GetPhasesUseCase } from './use-cases/phases/get-phases.use-case';
import { GetPhaseUseCase } from './use-cases/phases/get-phase.use-case';
import { UpdatePhaseUseCase } from './use-cases/phases/update-phase.use-case';
import { DeletePhaseUseCase } from './use-cases/phases/delete-phase.use-case';

export { UserService as AccountService };
export { MatchManager };
export { PadRoller };
export { SongRoller };
export { StandingManager };
export { ScoringSystemProvider };
export { BracketSystemProvider };
export { LobbyManager };

export { CreateDivisionUseCase };
export { GetDivisionsUseCase };
export { GetDivisionUseCase };
export { UpdateDivisionUseCase };
export { DeleteDivisionUseCase };
export { GenerateBracketUseCase };

export { CreateMatchUseCase };
export { GetMatchesUseCase };
export { GetMatchUseCase };
export { UpdateMatchUseCase };
export { DeleteMatchUseCase };
export { RemovePlayersFromMatchUseCase };

export { CreatePlayerUseCase };
export { GetPlayersUseCase };
export { GetPlayerUseCase };
export { GetPlayerByNameUseCase };
export { UpdatePlayerUseCase };
export { DeletePlayerUseCase };

export { CreateRoundUseCase };
export { GetRoundsUseCase };
export { GetRoundUseCase };
export { UpdateRoundUseCase };
export { DeleteRoundUseCase };

export { CreateScoreUseCase };
export { GetScoresUseCase };
export { GetScoreUseCase };
export { GetScoresBySongUseCase };
export { UpdateScoreUseCase };
export { DeleteScoreUseCase };

export { CreateSongUseCase };
export { GetSongsUseCase };
export { GetSongUseCase };
export { GetSongByNameUseCase };
export { UpdateSongUseCase };
export { DeleteSongUseCase };

export { CreateStandingUseCase };
export { GetStandingsUseCase };
export { GetStandingUseCase };
export { UpdateStandingUseCase };
export { DeleteStandingUseCase };

export { CreateSetupUseCase };
export { GetSetupsUseCase };
export { GetSetupUseCase };
export { UpdateSetupUseCase };
export { DeleteSetupUseCase };

export { CreateMatchAssignmentUseCase };
export { GetMatchAssignmentsUseCase };
export { GetMatchAssignmentUseCase };
export { UpdateMatchAssignmentUseCase };
export { DeleteMatchAssignmentUseCase };

export { CreateTournamentUseCase };
export { GetTournamentsUseCase };
export { GetPublicTournamentsUseCase };
export { GetTournamentUseCase };
export { UpdateTournamentUseCase };
export { DeleteTournamentUseCase };
export { AssignTournamentHelperUseCase };
export { RemoveTournamentHelperUseCase };
export { GetTournamentPlayersUseCase };
export { AddPlayerToTournamentUseCase };
export { RemovePlayerFromTournamentUseCase };
export { GetTournamentSongsUseCase };
export { AddSongToTournamentUseCase };
export { RemoveSongFromTournamentUseCase };
export { GetPlayerTournamentsUseCase };
export { IsHelperOfAnyUseCase };
export { GetMyTournamentRolesUseCase };
export { GetTournamentByDivisionUseCase };
export { GetTournamentByPhaseUseCase };
export { GetLobbiesUseCase };
export { ConnectLobbyUseCase };
export { DisconnectLobbyUseCase };

export { CreatePhaseUseCase };
export { GetPhasesUseCase };
export { GetPhaseUseCase };
export { UpdatePhaseUseCase };
export { DeletePhaseUseCase };

export const Services = [
    UserService,
    MatchManager,
    PadRoller,
    SongRoller,
    StandingManager,
    ScoringSystemProvider,
    BracketSystemProvider,
    LobbyManager,

    // Division use cases
    CreateDivisionUseCase,
    GetDivisionsUseCase,
    GetDivisionUseCase,
    UpdateDivisionUseCase,
    DeleteDivisionUseCase,
    GenerateBracketUseCase,

    // Match use cases
    CreateMatchUseCase,
    GetMatchesUseCase,
    GetMatchUseCase,
    UpdateMatchUseCase,
    DeleteMatchUseCase,
    RemovePlayersFromMatchUseCase,

    // Player use cases
    CreatePlayerUseCase,
    GetPlayersUseCase,
    GetPlayerUseCase,
    GetPlayerByNameUseCase,
    UpdatePlayerUseCase,
    DeletePlayerUseCase,

    // Round use cases
    CreateRoundUseCase,
    GetRoundsUseCase,
    GetRoundUseCase,
    UpdateRoundUseCase,
    DeleteRoundUseCase,

    // Score use cases
    CreateScoreUseCase,
    GetScoresUseCase,
    GetScoreUseCase,
    GetScoresBySongUseCase,
    UpdateScoreUseCase,
    DeleteScoreUseCase,

    // Song use cases
    CreateSongUseCase,
    GetSongsUseCase,
    GetSongUseCase,
    GetSongByNameUseCase,
    UpdateSongUseCase,
    DeleteSongUseCase,

    // Standing use cases
    CreateStandingUseCase,
    GetStandingsUseCase,
    GetStandingUseCase,
    UpdateStandingUseCase,
    DeleteStandingUseCase,

    // Setup use cases
    CreateSetupUseCase,
    GetSetupsUseCase,
    GetSetupUseCase,
    UpdateSetupUseCase,
    DeleteSetupUseCase,

    // MatchAssignment use cases
    CreateMatchAssignmentUseCase,
    GetMatchAssignmentsUseCase,
    GetMatchAssignmentUseCase,
    UpdateMatchAssignmentUseCase,
    DeleteMatchAssignmentUseCase,

    // Tournament use cases
    CreateTournamentUseCase,
    GetTournamentsUseCase,
    GetPublicTournamentsUseCase,
    GetTournamentUseCase,
    UpdateTournamentUseCase,
    DeleteTournamentUseCase,
    AssignTournamentHelperUseCase,
    RemoveTournamentHelperUseCase,
    GetTournamentPlayersUseCase,
    AddPlayerToTournamentUseCase,
    RemovePlayerFromTournamentUseCase,
    GetTournamentSongsUseCase,
    AddSongToTournamentUseCase,
    RemoveSongFromTournamentUseCase,
    GetPlayerTournamentsUseCase,
    IsHelperOfAnyUseCase,
    GetMyTournamentRolesUseCase,
    GetTournamentByDivisionUseCase,
    GetTournamentByPhaseUseCase,
    GetLobbiesUseCase,
    ConnectLobbyUseCase,
    DisconnectLobbyUseCase,

    // Phase use cases
    CreatePhaseUseCase,
    GetPhasesUseCase,
    GetPhaseUseCase,
    UpdatePhaseUseCase,
    DeletePhaseUseCase,
];
