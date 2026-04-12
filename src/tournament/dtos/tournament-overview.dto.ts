export type TournamentOverviewDivisionPlayerDto = {
    id: number;
    playerName: string;
};

export type TournamentOverviewParticipantDto = {
    id: number;
    roles: string[];
    status: string;
    player: TournamentOverviewDivisionPlayerDto;
};

export type TournamentOverviewEntrantDto = {
    id: number;
    name: string;
    type: string;
    seedNum: number | null;
    status: string;
    participants: TournamentOverviewParticipantDto[];
};

export type TournamentOverviewDivisionPhaseDto = {
    id: number;
    name: string;
    matchCount: number;
};

export type TournamentOverviewDivisionDto = {
    id: number;
    name: string;
    entrants: TournamentOverviewEntrantDto[];
    phases: TournamentOverviewDivisionPhaseDto[];
};

export type TournamentOverviewDto = {
    divisionCount: number;
    playerCount: number;
    matchCount: number;
    divisions: TournamentOverviewDivisionDto[];
};
