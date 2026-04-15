export type MatchListSongDto = {
    id: number;
    title: string;
};

export type MatchListPlayerDto = {
    id: number;
    playerName: string;
};

export type MatchListParticipantDto = {
    id: number;
    roles: string[];
    status: string;
    player: MatchListPlayerDto;
};

export type MatchListEntrantDto = {
    id: number;
    name: string;
    type: string;
    seedNum: number | null;
    status: string;
    participants: MatchListParticipantDto[];
};

export type MatchListScoreDto = {
    id: number;
    percentage: number;
    isFailed: boolean;
    player: MatchListPlayerDto;
    song: MatchListSongDto;
};

export type MatchListStandingDto = {
    id: number;
    points: number;
    score: MatchListScoreDto;
};

export type MatchListRoundDto = {
    id: number;
    song: MatchListSongDto;
    standings: MatchListStandingDto[];
};

export type MatchListResultEntryDto = {
    playerId: number;
    points: number;
};

export type MatchListResultDto = {
    id: number;
    playerPoints: MatchListResultEntryDto[];
};

export type MatchListDto = {
    id: number;
    name: string;
    subtitle: string;
    notes: string;
    scoringSystem: string;
    entrants: MatchListEntrantDto[];
    rounds: MatchListRoundDto[];
    targetPaths: number[];
    sourcePaths: number[];
    matchResult?: MatchListResultDto | null;
    phaseId?: number;
};
