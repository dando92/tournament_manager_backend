export type TournamentOverviewDivisionPlayerDto = {
    id: number;
    playerName: string;
};

export type TournamentOverviewDivisionPhaseDto = {
    id: number;
    name: string;
    matchCount: number;
};

export type TournamentOverviewDivisionDto = {
    id: number;
    name: string;
    players: TournamentOverviewDivisionPlayerDto[];
    phases: TournamentOverviewDivisionPhaseDto[];
};

export type TournamentOverviewDto = {
    divisionCount: number;
    playerCount: number;
    matchCount: number;
    divisions: TournamentOverviewDivisionDto[];
};
