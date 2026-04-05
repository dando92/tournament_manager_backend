export type DivisionSummaryPlayerDto = {
    id: number;
    playerName: string;
};

export type DivisionSummaryPhaseDto = {
    id: number;
    name: string;
    matchCount: number;
};

export type DivisionSummaryDto = {
    id: number;
    name: string;
    playersPerMatch: number | null;
    seeding: number[] | null;
    players: DivisionSummaryPlayerDto[];
    phases: DivisionSummaryPhaseDto[];
};
