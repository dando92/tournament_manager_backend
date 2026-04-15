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
} from '@syncstart/index';

export type { LiveMatchStateDto, LobbyPlayerDto, LobbyStateDto };

type LobbyMeta = {
  tournamentId: number;
  lobbyId: string;
  lobbyName: string;
  lobbyCode: string;
};

type CachedLobbyPayload = LobbyMeta & { payload: LobbyStatePayload };

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

  private lastLobbyPayloads = new Map<string, CachedLobbyPayload>();

  afterInit() {}

  RegisterLobby(
    tournamentId: number,
    lobbyId: string,
    lobbyName: string,
    lobbyCode: string,
  ): void {
    this.broadcast('OnLobbyActive', {
      tournamentId,
      lobbyId,
      lobbyName,
      lobbyCode,
    });
  }

  UnregisterLobby(lobbyId: string): void {
    this.lastLobbyPayloads.delete(lobbyId);
  }

  handleConnection(client: WebSocket) {
    console.log(
      `[ItgOnlineProxyGateway] Frontend client connected (total: ${this.server.clients.size})`,
    );

    this.lastLobbyPayloads.forEach(
      ({ tournamentId, lobbyId, lobbyName, lobbyCode, payload }) => {
        this.sendToClient(client, 'OnLobbyActive', {
          tournamentId,
          lobbyId,
          lobbyName,
          lobbyCode,
        });
        const lobbyStateDto = this.toLobbyStateDto(payload);
        this.sendToClient(client, 'OnLobbyState', {
          tournamentId,
          lobbyId,
          lobbyName,
          lobbyCode,
          ...lobbyStateDto,
        });

        if (!this.hasGameplayState(payload)) return;
        const liveMatchStateDto = this.toLiveMatchStateDto(payload);
        this.sendToClient(client, 'OnLiveMatchState', {
          tournamentId,
          lobbyId,
          lobbyName,
          lobbyCode,
          ...liveMatchStateDto,
        });
      },
    );
  }

  async OnLobbyStateChanged(
    tournamentId: number,
    lobbyState: LobbyStatePayload,
    lobbyCode: string,
    lobbyName: string,
  ): Promise<void> {
    const lobbyId = lobbyCode;
    this.lastLobbyPayloads.set(lobbyId, {
      tournamentId,
      lobbyId,
      lobbyName,
      lobbyCode,
      payload: lobbyState,
    });

    const lobbyStateDto = this.toLobbyStateDto(lobbyState);
    this.broadcast('OnLobbyState', {
      tournamentId,
      lobbyId,
      lobbyName,
      lobbyCode,
      ...lobbyStateDto,
    });

    if (this.hasGameplayState(lobbyState)) {
      const liveMatchStateDto = this.toLiveMatchStateDto(lobbyState);
      this.broadcast('OnLiveMatchState', {
        tournamentId,
        lobbyId,
        lobbyName,
        lobbyCode,
        ...liveMatchStateDto,
      });
      return;
    }
  }

  OnLobbyDisconnected(tournamentId: number, lobbyCode: string): void {
    const lobbyId = lobbyCode;
    this.lastLobbyPayloads.delete(lobbyId);
    this.broadcast('OnLobbyDisconnected', { tournamentId, lobbyId, lobbyCode });
  }

  private hasGameplayState(lobby: LobbyStatePayload): boolean {
    return lobby.players.some((player) => player.screenName === 'ScreenGameplay');
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
          isFailed: player.isFailed ?? false,
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
