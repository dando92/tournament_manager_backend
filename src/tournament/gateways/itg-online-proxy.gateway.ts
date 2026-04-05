import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server as WsServer, WebSocket } from 'ws';
import { ILobbyStateObserver } from '../interfaces/lobby-state-observer.interface';
import {
  LiveMatchPlayerDto,
  LiveMatchStateDto,
  LobbyPlayerDto,
  LobbyStateDto,
  LobbyStatePayload,
} from '../itg-online.types';

export type { LiveMatchStateDto, LobbyPlayerDto, LobbyStateDto };

type LobbyMeta = {
  tournamentId: number;
  lobbyId: string;
  lobbyName: string;
  lobbyCode: string;
};

type CachedLobbyState = LobbyMeta & { data: LobbyStateDto };
type CachedLiveMatchState = LobbyMeta & { data: LiveMatchStateDto };

@WebSocketGateway({
  path: '/scoreupdatehub',
  cors: {
    origin: '*',
  },
})
export class ItgOnlineProxyGateway
  implements OnGatewayInit, OnGatewayConnection, ILobbyStateObserver
{
  @WebSocketServer()
  server: WsServer;

  private activeLobbyMeta = new Map<string, LobbyMeta>();
  private lastLobbyStates = new Map<string, CachedLobbyState>();
  private lastLiveMatchStates = new Map<string, CachedLiveMatchState>();

  afterInit() {}

  RegisterLobby(
    tournamentId: number,
    lobbyId: string,
    lobbyName: string,
    lobbyCode: string,
  ): void {
    this.activeLobbyMeta.set(lobbyId, {
      tournamentId,
      lobbyId,
      lobbyName,
      lobbyCode,
    });
    this.broadcast('OnLobbyActive', {
      tournamentId,
      lobbyId,
      lobbyName,
      lobbyCode,
    });
  }

  UnregisterLobby(lobbyId: string): void {
    this.activeLobbyMeta.delete(lobbyId);
    this.lastLobbyStates.delete(lobbyId);
    this.lastLiveMatchStates.delete(lobbyId);
  }

  handleConnection(client: WebSocket) {
    console.log(
      `[ItgOnlineProxyGateway] Frontend client connected (total: ${this.server.clients.size})`,
    );

    this.activeLobbyMeta.forEach(
      ({ tournamentId, lobbyId, lobbyName, lobbyCode }) => {
        this.sendToClient(client, 'OnLobbyActive', {
          tournamentId,
          lobbyId,
          lobbyName,
          lobbyCode,
        });
      },
    );

    this.lastLobbyStates.forEach(
      ({ tournamentId, lobbyId, lobbyName, lobbyCode, data }) => {
        this.sendToClient(client, 'OnLobbyState', {
          tournamentId,
          lobbyId,
          lobbyName,
          lobbyCode,
          ...data,
        });
      },
    );

    this.lastLiveMatchStates.forEach(
      ({ tournamentId, lobbyId, lobbyName, lobbyCode, data }) => {
        this.sendToClient(client, 'OnLiveMatchState', {
          tournamentId,
          lobbyId,
          lobbyName,
          lobbyCode,
          ...data,
        });
      },
    );
  }

  async OnLobbyStateChanged(
    tournamentId: number,
    lobbyState: LobbyStatePayload,
    lobbyId: string,
    lobbyName: string,
  ): Promise<void> {
    const lobbyCode = this.activeLobbyMeta.get(lobbyId)?.lobbyCode ?? '';
    const lobbyStateDto = this.toLobbyStateDto(lobbyState);

    this.lastLobbyStates.set(lobbyId, {
      tournamentId,
      lobbyId,
      lobbyName,
      lobbyCode,
      data: lobbyStateDto,
    });
    this.broadcast('OnLobbyState', {
      tournamentId,
      lobbyId,
      lobbyName,
      lobbyCode,
      ...lobbyStateDto,
    });

    if (lobbyState.players.some((player) => player.screenName === 'ScreenGameplay')) {
      const liveMatchStateDto = this.toLiveMatchStateDto(lobbyState);
      this.lastLiveMatchStates.set(lobbyId, {
        tournamentId,
        lobbyId,
        lobbyName,
        lobbyCode,
        data: liveMatchStateDto,
      });
      this.broadcast('OnLiveMatchState', {
        tournamentId,
        lobbyId,
        lobbyName,
        lobbyCode,
        ...liveMatchStateDto,
      });
      return;
    }

    this.lastLiveMatchStates.delete(lobbyId);
  }

  OnLobbyDisconnected(tournamentId: number, lobbyId: string): void {
    this.activeLobbyMeta.delete(lobbyId);
    this.lastLobbyStates.delete(lobbyId);
    this.lastLiveMatchStates.delete(lobbyId);
    this.broadcast('OnLobbyDisconnected', { tournamentId, lobbyId });
  }

  private toLobbyStateDto(lobby: LobbyStatePayload): LobbyStateDto {
    return {
      songTitle: lobby.songInfo?.title ?? '',
      songPath: lobby.songInfo?.songPath ?? '',
      spectators: lobby.spectators,
      players: lobby.players.map(
        (player): LobbyPlayerDto => ({
          name: player.profileName,
          playerId: player.playerId,
          screenName: player.screenName,
          ready: player.ready,
        }),
      ),
    };
  }

  private toLiveMatchStateDto(lobby: LobbyStatePayload): LiveMatchStateDto {
    return {
      songTitle: lobby.songInfo?.title ?? '',
      songPath: lobby.songInfo?.songPath ?? '',
      players: lobby.players.map(
        (player): LiveMatchPlayerDto => ({
          name: player.profileName,
          playerId: player.playerId,
          scorePercent: player.score ?? 0,
          exScore: player.exScore,
          isFailed: player.isFailed ?? false,
          songProgression: player.songProgression,
          judgments: player.judgments
            ? {
                fantasticPlus: player.judgments.fantasticPlus,
                fantastics: player.judgments.fantastics,
                excellents: player.judgments.excellents,
                greats: player.judgments.greats,
                decents: player.judgments.decents ?? 0,
                wayOffs: player.judgments.wayOffs ?? 0,
                misses: player.judgments.misses,
                minesHit: player.judgments.minesHit,
                holdsHeld: player.judgments.holdsHeld,
                totalHolds: player.judgments.totalHolds,
              }
            : undefined,
        }),
      ),
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
