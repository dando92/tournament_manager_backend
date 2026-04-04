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

type LobbyMeta = { tournamentId: number; lobbyId: string; lobbyName: string; lobbyCode: string };
type CachedLobbyState = LobbyMeta & { payload: LobbyStatePayload };

@WebSocketGateway({
  path: '/scoreupdatehub',
  cors: {
    origin: '*',
  },
})
export class ItgOnlineProxyGateway implements OnGatewayInit, OnGatewayConnection, ILobbyStateObserver {
  @WebSocketServer()
  server: WsServer;

  // keyed by lobbyId — tracks all active (registered) lobbies
  private activeLobbyMeta = new Map<string, LobbyMeta>();
  // keyed by lobbyId — only populated once lobby state arrives (connected)
  private lastLobbyStates = new Map<string, CachedLobbyState>();

  afterInit() {}

  RegisterLobby(tournamentId: number, lobbyId: string, lobbyName: string, lobbyCode: string): void {
    this.activeLobbyMeta.set(lobbyId, { tournamentId, lobbyId, lobbyName, lobbyCode });
    this.broadcast('OnLobbyActive', { tournamentId, lobbyId, lobbyName, lobbyCode });
  }

  UnregisterLobby(lobbyId: string): void {
    this.activeLobbyMeta.delete(lobbyId);
    this.lastLobbyStates.delete(lobbyId);
  }

  handleConnection(client: WebSocket) {
    console.log(`[ItgOnlineProxyGateway] Frontend client connected (total: ${this.server.clients.size})`);
    // Send active lobby info so client knows which lobbies exist
    this.activeLobbyMeta.forEach(({ tournamentId, lobbyId, lobbyName, lobbyCode }) => {
      this.sendToClient(client, 'OnLobbyActive', { tournamentId, lobbyId, lobbyName, lobbyCode });
    });
    // Send last known state for connected lobbies
    this.lastLobbyStates.forEach(({ tournamentId, lobbyId, lobbyName, lobbyCode, payload }) => {
      if (payload.players.length > 0) {
        this.sendToClient(client, 'OnLobbyState', { tournamentId, lobbyId, lobbyName, lobbyCode, ...this.toDto(payload) });
      }
    });
  }

  async OnLobbyStateChanged(tournamentId: number, lobbyState: LobbyStatePayload, lobbyId: string, lobbyName: string): Promise<void> {
    const lobbyCode = this.activeLobbyMeta.get(lobbyId)?.lobbyCode ?? '';
    this.lastLobbyStates.set(lobbyId, { tournamentId, lobbyId, lobbyName, lobbyCode, payload: lobbyState });
    this.broadcast('OnLobbyState', { tournamentId, lobbyId, lobbyName, lobbyCode, ...this.toDto(lobbyState) });
  }

  OnLobbyDisconnected(tournamentId: number, lobbyId: string): void {
    this.activeLobbyMeta.delete(lobbyId);
    this.lastLobbyStates.delete(lobbyId);
    this.broadcast('OnLobbyDisconnected', { tournamentId, lobbyId });
  }

  private toDto(lobby: LobbyStatePayload): LobbyStateDto {
    return {
      songTitle: lobby.songInfo?.title ?? '',
      songPath: lobby.songInfo?.songPath ?? '',
      players: lobby.players.map((p) => ({
        name: p.profileName,
        playerId: p.playerId,
        scorePercent: p.score ?? 0,
        exScore: p.exScore,
        isFailed: p.isFailed ?? false,
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
