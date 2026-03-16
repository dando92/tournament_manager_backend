import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { WebSocket, Server as WsServer } from 'ws';
import { ILobbyStateObserver } from '../interfaces/lobby-state-observer.interface';
import { LobbyStatePayload, LobbyStateDto, LobbyPlayerDto } from '../itg-online.types';

export type { LobbyStateDto, LobbyPlayerDto };

@WebSocketGateway({
  path: '/scoreupdatehub',
  cors: {
    origin: '*',
  },
})
export class ItgOnlineProxyGateway implements OnGatewayInit, OnGatewayConnection, ILobbyStateObserver {
  @WebSocketServer()
  server: WsServer;

  private lastLobbyStates = new Map<number, LobbyStatePayload>();

  afterInit() {}

  handleConnection(client: WebSocket) {
    console.log(`[ItgOnlineProxyGateway] Frontend client connected (total: ${this.server.clients.size})`);
    this.lastLobbyStates.forEach((state, tournamentId) => {
      this.sendToClient(client, 'OnLobbyState', { tournamentId, ...this.toDto(state) });
    });
  }

  async OnLobbyStateChanged(tournamentId: number, lobbyState: LobbyStatePayload): Promise<void> {
    this.lastLobbyStates.set(tournamentId, lobbyState);
    this.broadcast('OnLobbyState', { tournamentId, ...this.toDto(lobbyState) });
  }

  OnLobbyDisconnected(tournamentId: number): void {
    this.lastLobbyStates.delete(tournamentId);
    this.broadcast('OnLobbyDisconnected', { tournamentId });
  }

  private toDto(lobby: LobbyStatePayload): LobbyStateDto {
    return {
      songTitle: lobby.songInfo?.title ?? '',
      songPath: lobby.songInfo?.songPath ?? '',
      players: lobby.players.map((p) => ({
        name: p.name,
        playerId: p.playerId,
        scorePercent: p.score,
        health: p.health / 100,
        isFailed: p.failed ?? false,
        judgments: p.judgments
          ? {
              fantasticPlus: p.judgments.fantasticPlus,
              fantastics: p.judgments.fantastics,
              excellents: p.judgments.excellents,
              greats: p.judgments.greats,
              decents: p.judgments.decents ?? 0,
              wayOffs: p.judgments.wayOffs ?? 0,
              misses: p.judgments.misses,
              minesHit: p.judgments.minesHit,
              holdsHeld: p.judgments.holdsHeld,
              totalHolds: p.judgments.totalHolds,
            }
          : undefined,
      })),
    };
  }

  private sendToClient(client: WebSocket, event: string, data: unknown) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }

  private broadcast(event: string, data: unknown) {
    const msg = JSON.stringify({ event, data });
    console.log(`[ItgOnlineProxyGateway] Broadcasting ${event} to ${this.server.clients.size} client(s)`);
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }
}
