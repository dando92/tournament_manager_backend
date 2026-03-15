export class HoldNote {
    none: number;
    letGo: number;
    held: number;
    missed: number;
}

export class TapNote {
    none: number;
    hitMine: number;
    avoidMine: number;
    checkpointMiss: number;
    miss: number;
    W5: number;
    W4: number;
    W3: number;
    W2: number;
    W1: number;
    W0: number;
    checkpointHit: number;
}

export class LiveScore {
    song: string;
    matchId: number;
    playerNumber: number;
    playerName: string;
    actualDancePoints: number;
    currentPossibleDancePoints: number;
    possibleDancePoints: number;
    formattedScore: string;
    life: number;
    isFailed: boolean;
    tapNote: TapNote;
    holdNote: HoldNote;
    totalHoldsCount: number;
    id: string;
}

export type SongCompletedPayload = {
    playerName: string;
    songPath: string;
    scorePercent: number;
    isFailed: boolean;
};
