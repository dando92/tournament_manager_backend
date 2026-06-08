import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server as WsServer, WebSocket } from 'ws';
import {
  ILobbyObserver,
  LobbyConnectionDto,
  LobbyMatchUpdateDto,
  LobbyPlayerReadyDto,
  LobbySongCompletedDto,
  LobbySongSelectedDto,
  SyncStartConnectionStatusDto,
} from '@syncstart/index';

export type ActiveLobbyDto = LobbyConnectionDto;
export type SyncStartStatusDto = SyncStartConnectionStatusDto;

export type LobbyCardPlayerDto = {
  playerId: string;
  playerName: string;
  ready: boolean;
};

export type LobbyCardStateDto = {
  tournamentId: number;
  lobbyId: string;
  lobbyName: string;
  lobbyCode: string;
  songTitle: string;
  songPath: string;
  players: LobbyCardPlayerDto[];
};

export type LiveMatchPlayerDto = {
  playerId: string;
  playerName: string;
  score: number;
  exScore?: number;
  isFailed: boolean;
  isCompleted?: boolean;
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
  tournamentId: number;
  lobbyId: string;
  lobbyName: string;
  lobbyCode: string;
  songTitle: string;
  songPath: string;
  players: LiveMatchPlayerDto[];
};

type CachedLobbyState = {
  active: ActiveLobbyDto;
  cardState: LobbyCardStateDto;
  liveMatchState?: LiveMatchStateDto;
};

@WebSocketGateway({
  path: '/scoreupdatehub',
  cors: {
    origin: '*',
  },
})
export class ItgOnlineProxyGateway
  implements OnGatewayInit, OnGatewayConnection, ILobbyObserver
{
  @WebSocketServer()
  server: WsServer;

  private lobbyStates = new Map<string, CachedLobbyState>();

  afterInit() {}

  handleConnection(client: WebSocket) {
    console.log(
      `[ItgOnlineProxyGateway] Frontend client connected (total: ${this.server.clients.size})`,
    );

    this.lobbyStates.forEach(({ active, cardState, liveMatchState }) => {
      this.sendToClient(client, active.isConnected ? 'OnConnected' : 'OnConnectionActive', active);
      if (cardState.songTitle || cardState.songPath) {
        this.sendToClient(client, 'OnSongSelected', {
          tournamentId: cardState.tournamentId,
          lobbyId: cardState.lobbyId,
          lobbyName: cardState.lobbyName,
          lobbyCode: cardState.lobbyCode,
          songTitle: cardState.songTitle,
          songPath: cardState.songPath,
        });
      }
      cardState.players.forEach((player) => {
        this.sendToClient(client, 'OnPlayerReady', {
          tournamentId: cardState.tournamentId,
          lobbyId: cardState.lobbyId,
          lobbyName: cardState.lobbyName,
          lobbyCode: cardState.lobbyCode,
          ...player,
        });
      });
      if (liveMatchState) {
        this.sendToClient(client, 'OnGoingMatchUpdate', liveMatchState);
      }
    });
  }

  OnSyncStartConnectionStatus(event: SyncStartConnectionStatusDto): void {
    this.broadcast('OnSyncStartConnectionStatus', event);
  }

  OnConnected(event: LobbyConnectionDto): void {
    const current = this.getOrCreateLobbyState(event);
    current.active = event;
    this.lobbyStates.set(event.lobbyId, current);
    this.broadcast('OnConnected', event);
  }

  OnConnectionActive(event: LobbyConnectionDto): void {
    const current = this.getOrCreateLobbyState(event);
    current.active = event;
    this.lobbyStates.set(event.lobbyId, current);
    this.broadcast('OnConnectionActive', event);
  }

  OnDisconnection(event: LobbyConnectionDto): void {
    if (!event.isActive) {
      this.lobbyStates.delete(event.lobbyId);
    } else {
      const current = this.getOrCreateLobbyState(event);
      current.active = event;
      this.lobbyStates.set(event.lobbyId, current);
    }
    this.broadcast('OnDisconnection', event);
  }

  OnSongSelected(event: LobbySongSelectedDto): void {
    const current = this.getOrCreateLobbyState(event);
    current.cardState = {
      ...current.cardState,
      songTitle: event.song.title,
      songPath: event.song.songPath,
    };
    this.lobbyStates.set(event.lobbyId, current);
    this.broadcast('OnSongSelected', {
      tournamentId: event.tournamentId,
      lobbyId: event.lobbyId,
      lobbyName: event.lobbyName,
      lobbyCode: event.lobbyCode,
      songTitle: event.song.title,
      songPath: event.song.songPath,
    });
  }

  OnPlayerReady(event: LobbyPlayerReadyDto): void {
    const current = this.getOrCreateLobbyState(event);
    const players = current.cardState.players.filter(
      (player) => player.playerId !== event.playerId,
    );
    players.push({
      playerId: event.playerId,
      playerName: event.playerName,
      ready: event.ready,
    });
    current.cardState = {
      ...current.cardState,
      players: players.sort((a, b) => a.playerName.localeCompare(b.playerName)),
    };
    this.lobbyStates.set(event.lobbyId, current);
    this.broadcast('OnPlayerReady', {
      tournamentId: event.tournamentId,
      lobbyId: event.lobbyId,
      lobbyName: event.lobbyName,
      lobbyCode: event.lobbyCode,
      playerId: event.playerId,
      playerName: event.playerName,
      ready: event.ready,
    });
  }

  OnGoingMatchUpdate(event: LobbyMatchUpdateDto): void {
    const current = this.getOrCreateLobbyState(event);
    const liveMatchState: LiveMatchStateDto = {
      tournamentId: event.tournamentId,
      lobbyId: event.lobbyId,
      lobbyName: event.lobbyName,
      lobbyCode: event.lobbyCode,
      songTitle: event.song?.title ?? current.cardState.songTitle,
      songPath: event.song?.songPath ?? current.cardState.songPath,
      players: event.players.map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        score: player.score,
        exScore: player.exScore,
        isFailed: player.isFailed,
        songProgression: player.songProgression,
        judgments: player.judgments,
      })),
    };
    current.liveMatchState = liveMatchState;
    this.lobbyStates.set(event.lobbyId, current);
    this.broadcast('OnGoingMatchUpdate', liveMatchState);
  }

  OnSongCompleted(event: LobbySongCompletedDto): void {
    const current = this.getOrCreateLobbyState(event);
    const completedState: LiveMatchStateDto = {
      tournamentId: event.tournamentId,
      lobbyId: event.lobbyId,
      lobbyName: event.lobbyName,
      lobbyCode: event.lobbyCode,
      songTitle: event.song.title,
      songPath: event.song.songPath,
      players: event.scores.map((score) => ({
        playerId: score.playerId,
        playerName: score.playerName,
        score: score.score,
        exScore: score.exScore,
        isFailed: score.isFailed,
        isCompleted: true,
      })),
    };
    current.liveMatchState = completedState;
    this.lobbyStates.set(event.lobbyId, current);
    this.broadcast('OnSongCompleted', completedState);
  }

  private getOrCreateLobbyState(identity: {
    tournamentId: number;
    lobbyId: string;
    lobbyName: string;
    lobbyCode: string;
  }): CachedLobbyState {
    const existing = this.lobbyStates.get(identity.lobbyId);
    if (existing) return existing;
    return {
      active: {
        tournamentId: identity.tournamentId,
        lobbyId: identity.lobbyId,
        lobbyName: identity.lobbyName,
        lobbyCode: identity.lobbyCode,
        isActive: true,
        isConnected: false,
      },
      cardState: {
        tournamentId: identity.tournamentId,
        lobbyId: identity.lobbyId,
        lobbyName: identity.lobbyName,
        lobbyCode: identity.lobbyCode,
        songTitle: '',
        songPath: '',
        players: [],
      },
    };
  }

  private sendToClient(client: WebSocket, event: string, data: unknown) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }

  private broadcast(event: string, data: unknown) {
    const msg = JSON.stringify({ event, data });
    console.log(
      `[ItgOnlineProxyGateway] Broadcasting ${event} to ${this.server.clients.size} client(s)`,
    );
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }
}
