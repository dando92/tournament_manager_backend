export type StartggTournamentRef = {
    id: string;
    name: string;
    slug?: string | null;
};

export type StartggParticipantNode = {
    id: string;
    gamerTag: string;
};

export type StartggEntrantNode = {
    id: string;
    name: string;
    participants: StartggParticipantNode[];
};

export type StartggSeedNode = {
    id: string;
    seedNum: number;
    entrant: StartggEntrantNode | null;
};

export type StartggPhaseNode = {
    id: string;
    name: string;
};

export type StartggSetNode = {
    id: string;
    fullRoundText?: string | null;
    phaseId?: string | null;
    phaseName?: string | null;
    phaseGroupId?: string | null;
    phaseGroupName?: string | null;
    entrants: Array<{
        id: string;
        name: string;
    }>;
};

export type StartggEventNode = {
    id: string;
    name: string;
    slug: string;
    tournament?: StartggTournamentRef | null;
    phases: StartggPhaseNode[];
};

export type StartggEventSnapshot = {
    event: StartggEventNode;
    entrants: StartggEntrantNode[];
    seeds: StartggSeedNode[];
    sets: StartggSetNode[];
};
