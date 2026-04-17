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
    status: string;
    participants: TournamentOverviewParticipantDto[];
};

export type TournamentOverviewDivisionPhaseDto = {
    id: number;
    name: string;
    type: 'pool' | 'bracket';
    matchCount: number;
    phaseGroups: Array<{
        id: number;
        name: string;
        mode: 'set-driven' | 'progression-driven';
        matchCount: number;
    }>;
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
