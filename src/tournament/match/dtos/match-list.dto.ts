export type MatchListSongDto = {
    id: number;
    title: string;
};

export type MatchListPlayerDto = {
    id: number;
    playerName: string;
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

export type MatchListDto = {
    id: number;
    name: string;
    subtitle: string;
    notes: string;
    scoringSystem: string;
    players: MatchListPlayerDto[];
    rounds: MatchListRoundDto[];
    targetPaths: number[];
    sourcePaths: number[];
    phaseId?: number;
};
