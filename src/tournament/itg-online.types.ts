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

// Matches syncstart's Player type
export type LobbyPlayer = {
  playerId: 'P1' | 'P2';
  profileName: string;
  screenName: 'NoScreen' | 'ScreenSelectMusic' | 'ScreenGameplay' | 'ScreenPlayerOptions' | 'ScreenEvaluation';
  ready: boolean;
  judgments?: Judgments;
  score?: number;
  exScore?: number;
  isFailed?: boolean;
  songProgression?: {
    currentTime: number;
    totalTime: number;
  };
};

// Matches syncstart's LobbyStatePayload type
export type LobbyStatePayload = {
  players: LobbyPlayer[];
  spectators: string[];
  code: string;
  songInfo?: {
    songPath: string;
    title: string;
    artist: string;
    songLength: number;
  };
};

export type LobbyPlayerDto = {
  name: string;
  playerId: string;
  scorePercent: number;
  exScore?: number;
  health?: number;
  isFailed?: boolean;
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
