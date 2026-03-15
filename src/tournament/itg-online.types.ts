export type Judgments = {
  fantasticPlus: number;
  fantastics: number;
  excellents: number;
  greats: number;
  decents?: number;
  wayOffs?: number;
  misses: number;
  totalSteps: number;
  minesHit: number;
  totalMines: number;
  holdsHeld: number;
  totalHolds: number;
  rollsHeld: number;
  totalRolls: number;
};

export type LobbyPlayer = {
  playerId: 'P1' | 'P2';
  name: string;
  ready: boolean | null;
  ping?: number;
  diffLevel?: number;
  diffType?: string;
  judgments?: Judgments;
  score?: number;
  exScore?: number;
  health?: number;
  failed?: boolean;
  songProgression?: {
    currentTime: number;
    totalTime: number;
  };
};

export type LobbyStatePayload = {
  players: LobbyPlayer[];
  code: string;
  songInfo?: {
    songPath: string;
    title: string;
    artist: string;
    songLength: number;
  };
  temporary: boolean;
};

export type LobbyPlayerDto = {
  name: string;
  playerId: string;
  scorePercent: number;
  health: number;
  isFailed: boolean;
  judgments?: {
    fantasticPlus: number;
    fantastics: number;
    excellents: number;
    greats: number;
    decents: number;
    wayOffs: number;
    misses: number;
    minesHit: number;
    holdsHeld: number;
    totalHolds: number;
  };
};

export type LobbyStateDto = {
  songTitle: string;
  songPath: string;
  players: LobbyPlayerDto[];
};
