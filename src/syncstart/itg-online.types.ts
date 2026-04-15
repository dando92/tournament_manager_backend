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
  screenName: 'NoScreen' | 'ScreenSelectMusic' | 'ScreenGameplay' | 'ScreenPlayerOptions' | 'ScreenEvaluationStage';
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
  screenName: LobbyPlayer['screenName'];
  ready: boolean;
  isFailed?: boolean;
};

export type LobbyStateDto = {
  songTitle: string;
  songPath: string;
  spectators: string[];
  players: LobbyPlayerDto[];
};

export type LiveMatchPlayerDto = {
  name: string;
  playerId: string;
  scorePercent: number;
  exScore?: number;
  isFailed?: boolean;
  songProgression?: {
    currentTime: number;
    totalTime: number;
  };
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

export type LiveMatchStateDto = {
  songTitle: string;
  songPath: string;
  players: LiveMatchPlayerDto[];
};
