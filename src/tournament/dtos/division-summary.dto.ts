export type DivisionSummaryPlayerDto = {
    id: number;
    playerName: string;
};

export type DivisionSummaryParticipantDto = {
    id: number;
    roles: string[];
    status: string;
    player: DivisionSummaryPlayerDto;
};

export type DivisionSummaryEntrantDto = {
    id: number;
    name: string;
    type: string;
    status: string;
    participants: DivisionSummaryParticipantDto[];
};

export type DivisionSummaryPhaseSeedDto = {
    id: number;
    entrantId: number;
    seedNum: number;
};

export type DivisionSummaryPhaseDto = {
    id: number;
    name: string;
    type: 'pool' | 'bracket';
    matchCount: number;
    seeds: DivisionSummaryPhaseSeedDto[];
    phaseGroups: Array<{
        id: number;
        name: string;
        mode: 'set-driven' | 'progression-driven';
        matchCount: number;
    }>;
};

export type DivisionSummaryDto = {
    id: number;
    name: string;
    playersPerMatch: number | null;
    entrants: DivisionSummaryEntrantDto[];
    phases: DivisionSummaryPhaseDto[];
};
