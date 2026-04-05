import { WebSocket } from 'ws';
import { LobbyStatePayload } from '../itg-online.types';

type ConnectMode =
  | { type: 'spectate'; lobbyCode: string }
  | { type: 'create' };

class LobbyConnection {
  private connectionStarted = false;
  private connected = false;
  private hasConnectedOnce = false;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private password = '';
  private currentLobbyCode: string | null;

  constructor(
    private readonly syncstartUrl: string,
    private readonly mode: ConnectMode,
    private readonly onLobbyState: (
      lobbyCode: string,
      payload: LobbyStatePayload,
    ) => Promise<void>,
    private readonly onForcedDisconnect: (lobbyCode: string) => void,
  ) {
    this.currentLobbyCode =
      mode.type === 'spectate' ? mode.lobbyCode.toUpperCase() : null;
  }

  async Connect(
    password: string,
  ): Promise<{ lobbyCode: string; initialState: LobbyStatePayload }> {
    this.password = password;
    this.connectionStarted = true;
    console.log(
      `[LobbyConnection] Connecting mode=${this.mode.type} url=${this.syncstartUrl}`,
    );
    this._closeCurrentConnection();
    return this._connect();
  }

  Disconnect(): void {
    this.connectionStarted = false;
    this.connected = false;
    this._clearReconnectTimer();
    this._closeCurrentConnection();
  }

  IsActive(): boolean {
    return this.connectionStarted;
  }

  IsConnected(): boolean {
    return this.connected;
  }

  private _closeCurrentConnection(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private _connect(): Promise<{
    lobbyCode: string;
    initialState: LobbyStatePayload;
  }> {
    const url = this.syncstartUrl;
    console.log(
      `[LobbyConnection] Opening WebSocket to ${url} (mode=${this.mode.type})`,
    );

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.warn(
            `[LobbyConnection] Connection timed out after 10s (mode=${this.mode.type} url=${url})`,
          );
          ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      ws.on('open', () => {
        if (this.mode.type === 'create') {
          console.log('[LobbyConnection] WebSocket open, sending createLobby');
          ws.send(
            JSON.stringify({
              event: 'createLobby',
              data: {
                machine: {},
                password: this.password,
              },
            }),
          );
          return;
        }

        console.log(
          `[LobbyConnection] WebSocket open, sending spectateLobby (lobbyCode=${this.mode.lobbyCode})`,
        );
        ws.send(
          JSON.stringify({
            event: 'spectateLobby',
            data: {
              code: this.mode.lobbyCode,
              password: this.password,
              spectator: { profileName: 'TournamentManager' },
            },
          }),
        );
      });

      ws.on('message', async (data: Buffer) => {
        let payload: { event: string; data: unknown };
        try {
          payload = JSON.parse(data.toString());
        } catch {
          console.warn(
            `[LobbyConnection] Unparseable message: ${data
              .toString()
              .slice(0, 200)}`,
          );
          return;
        }

        console.log(`[LobbyConnection] Received event="${payload.event}"`);

        if (payload.event === 'lobbyState') {
          const lobbyState = payload.data as LobbyStatePayload;
          this.currentLobbyCode = lobbyState.code.toUpperCase();

          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            console.log(
              `[LobbyConnection] Connected and receiving lobbyState (lobbyCode=${this.currentLobbyCode})`,
            );
            this.ws = ws;
            this.connected = true;
            this.hasConnectedOnce = true;
            resolve({
              lobbyCode: this.currentLobbyCode,
              initialState: {
                ...lobbyState,
                code: this.currentLobbyCode,
              },
            });
            return;
          }

          await this.onLobbyState(this.currentLobbyCode, {
            ...lobbyState,
            code: this.currentLobbyCode,
          });
          return;
        }

        if (payload.event === 'clientDisconnected' && this.connectionStarted) {
          const reason =
            (payload.data as { reason?: string })?.reason ?? '(no reason)';
          console.warn(
            `[LobbyConnection] clientDisconnected, reason="${reason}" (lobbyCode=${this.currentLobbyCode ?? 'unknown'})`,
          );
          this.connectionStarted = false;
          this.connected = false;
          this._clearReconnectTimer();
          this._closeCurrentConnection();
          if (this.currentLobbyCode) {
            this.onForcedDisconnect(this.currentLobbyCode);
          }
        }
      });

      ws.on('close', (code, reason) => {
        const reasonStr = reason?.toString() || '(no reason)';
        this.connected = false;

        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          console.error(
            `[LobbyConnection] Closed before lobbyState received, code=${code} reason=${reasonStr}`,
          );
          reject(new Error(`Connection refused, code=${code} reason=${reasonStr}`));
          return;
        }

        console.warn(
          `[LobbyConnection] Connection closed, code=${code} reason=${reasonStr} (lobbyCode=${this.currentLobbyCode ?? 'unknown'})`,
        );

        if (
          this.connectionStarted &&
          this.hasConnectedOnce &&
          this.mode.type === 'spectate'
        ) {
          const lobbyCode = this.currentLobbyCode ?? this.mode.lobbyCode;
          console.log(
            `[LobbyConnection] Scheduling reconnect in 5s (lobbyCode=${lobbyCode})`,
          );
          this.ws = null;
          this._clearReconnectTimer();
          this.reconnectTimer = setTimeout(() => {
            this._connect().catch((err) =>
              console.error(
                `[LobbyConnection] Reconnect failed (lobbyCode=${lobbyCode}): ${err?.message ?? err}`,
              ),
            );
          }, 5000);
          return;
        }

        if (
          this.connectionStarted &&
          this.hasConnectedOnce &&
          this.mode.type === 'create'
        ) {
          this.connectionStarted = false;
          if (this.currentLobbyCode) {
            this.onForcedDisconnect(this.currentLobbyCode);
          }
        }
      });

      ws.on('error', (err) => {
        console.error(
          `[LobbyConnection] WebSocket error (lobbyCode=${this.currentLobbyCode ?? 'unknown'} url=${url}): ${err?.message ?? err}`,
        );
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }
}

export class SyncStartConnector {
  private connections = new Map<string, LobbyConnection>();

  constructor(
    private readonly syncstartUrl: string,
    private readonly onLobbyState: (
      lobbyCode: string,
      payload: LobbyStatePayload,
    ) => Promise<void>,
    private readonly onForcedDisconnect: (lobbyCode: string) => void,
  ) {}

  async CreateLobby(
    password: string,
  ): Promise<{ lobbyCode: string; initialState: LobbyStatePayload }> {
    const connection = new LobbyConnection(
      this.syncstartUrl,
      { type: 'create' },
      this.onLobbyState,
      this.onForcedDisconnect,
    );
    const result = await connection.Connect(password);
    this.connections.set(result.lobbyCode, connection);
    return result;
  }

  async ConnectLobby(
    lobbyCode: string,
    password: string,
  ): Promise<{ lobbyCode: string; initialState: LobbyStatePayload }> {
    const normalizedLobbyCode = lobbyCode.toUpperCase();
    if (this.connections.has(normalizedLobbyCode)) {
      throw new Error(`Lobby ${normalizedLobbyCode} is already connected`);
    }

    const connection = new LobbyConnection(
      this.syncstartUrl,
      { type: 'spectate', lobbyCode: normalizedLobbyCode },
      this.onLobbyState,
      this.onForcedDisconnect,
    );
    const result = await connection.Connect(password);
    this.connections.set(result.lobbyCode, connection);
    return result;
  }

  DisconnectLobby(lobbyCode: string): void {
    const normalizedLobbyCode = lobbyCode.toUpperCase();
    const connection = this.connections.get(normalizedLobbyCode);
    if (!connection) return;
    connection.Disconnect();
    this.connections.delete(normalizedLobbyCode);
  }

  DisconnectAll(): void {
    for (const [lobbyCode, connection] of this.connections) {
      connection.Disconnect();
      this.connections.delete(lobbyCode);
    }
  }

  GetLobbyStatus(
    lobbyCode: string,
  ): { isActive: boolean; isConnected: boolean } | undefined {
    const connection = this.connections.get(lobbyCode.toUpperCase());
    if (!connection) return undefined;
    return {
      isActive: connection.IsActive(),
      isConnected: connection.IsConnected(),
    };
  }

  GetAllLobbyCodes(): string[] {
    return Array.from(this.connections.keys());
  }
}
