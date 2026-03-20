import { WebSocket } from 'ws';
import { LobbyStatePayload } from '../itg-online.types';

// ─────────────────────────────────────────────────────────────────────────────
// LobbyConnection — one WebSocket connection per lobby code
// ─────────────────────────────────────────────────────────────────────────────

class LobbyConnection {
    private connectionStarted = false;
    private connected = false;
    private hasConnectedOnce = false;
    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private password = '';

    constructor(
        private readonly syncstartUrl: string,
        private readonly lobbyCode: string,
        private readonly onLobbyState: (lobbyCode: string, payload: LobbyStatePayload) => Promise<void>,
        private readonly onForcedDisconnect: (lobbyCode: string) => void,
    ) {}

    async Connect(password: string): Promise<void> {
        this.password = password;
        this.connectionStarted = true;
        console.log(`[LobbyConnection] Connecting lobbyCode=${this.lobbyCode} url=${this.syncstartUrl}`);
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

    private _connect(): Promise<void> {
        const url = this.syncstartUrl;
        console.log(`[LobbyConnection] Opening WebSocket to ${url} (lobbyCode=${this.lobbyCode})`);

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            let settled = false;

            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    console.warn(`[LobbyConnection] Connection timed out after 10s (lobbyCode=${this.lobbyCode} url=${url})`);
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);

            ws.on('open', () => {
                console.log(`[LobbyConnection] WebSocket open, sending spectateLobby (lobbyCode=${this.lobbyCode})`);
                ws.send(JSON.stringify({
                    event: 'spectateLobby',
                    data: {
                        code: this.lobbyCode,
                        password: this.password,
                        spectator: { profileName: 'TournamentManager' },
                    },
                }));
            });

            ws.on('message', async (data: Buffer) => {
                let payload: { event: string; data: unknown };
                try {
                    payload = JSON.parse(data.toString());
                } catch {
                    console.warn(`[LobbyConnection] Unparseable message (lobbyCode=${this.lobbyCode}): ${data.toString().slice(0, 200)}`);
                    return;
                }

                console.log(`[LobbyConnection] Received event="${payload.event}" (lobbyCode=${this.lobbyCode})`);

                if (payload.event === 'lobbyState') {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timeout);
                        console.log(`[LobbyConnection] Connected and receiving lobbyState (lobbyCode=${this.lobbyCode})`);
                        this.ws = ws;
                        this.connected = true;
                        this.hasConnectedOnce = true;
                        resolve();
                    }
                    await this.onLobbyState(this.lobbyCode, payload.data as LobbyStatePayload);
                } else if (payload.event === 'clientDisconnected') {
                    if (this.connectionStarted) {
                        const reason = (payload.data as { reason?: string })?.reason ?? '(no reason)';
                        console.warn(`[LobbyConnection] clientDisconnected — reason="${reason}" (lobbyCode=${this.lobbyCode}). Will not reconnect.`);
                        this.connectionStarted = false;
                        this.connected = false;
                        this._clearReconnectTimer();
                        this._closeCurrentConnection();
                        this.onForcedDisconnect(this.lobbyCode);
                    }
                }
            });

            ws.on('close', (code, reason) => {
                const reasonStr = reason?.toString() || '(no reason)';
                this.connected = false;
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    console.error(`[LobbyConnection] Closed before lobbyState received — code=${code} reason=${reasonStr} (lobbyCode=${this.lobbyCode})`);
                    reject(new Error(`Connection refused — code=${code} reason=${reasonStr}`));
                } else {
                    console.warn(`[LobbyConnection] Connection closed — code=${code} reason=${reasonStr} (lobbyCode=${this.lobbyCode})`);
                }
                if (this.connectionStarted && this.hasConnectedOnce) {
                    console.log(`[LobbyConnection] Scheduling reconnect in 5s (lobbyCode=${this.lobbyCode})`);
                    this.ws = null;
                    this._clearReconnectTimer();
                    this.reconnectTimer = setTimeout(() =>
                        this._connect().catch(err =>
                            console.error(`[LobbyConnection] Reconnect failed (lobbyCode=${this.lobbyCode}): ${err?.message ?? err}`)
                        ), 5000);
                }
            });

            ws.on('error', (err) => {
                console.error(`[LobbyConnection] WebSocket error (lobbyCode=${this.lobbyCode} url=${url}): ${err?.message ?? err}`);
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(err);
                }
            });
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SyncStartConnector — one per tournament, manages all lobby connections
// ─────────────────────────────────────────────────────────────────────────────

export class SyncStartConnector {
    private connections = new Map<string, LobbyConnection>();

    constructor(
        private readonly syncstartUrl: string,
        private readonly onLobbyState: (lobbyCode: string, payload: LobbyStatePayload) => Promise<void>,
        private readonly onForcedDisconnect: (lobbyCode: string) => void,
    ) {}

    async ConnectLobby(lobbyCode: string, password: string): Promise<void> {
        if (this.connections.has(lobbyCode)) {
            throw new Error(`Lobby ${lobbyCode} is already connected`);
        }
        const conn = new LobbyConnection(
            this.syncstartUrl,
            lobbyCode,
            this.onLobbyState,
            this.onForcedDisconnect,
        );
        await conn.Connect(password);
        this.connections.set(lobbyCode, conn);
    }

    DisconnectLobby(lobbyCode: string): void {
        const conn = this.connections.get(lobbyCode);
        if (conn) {
            conn.Disconnect();
            this.connections.delete(lobbyCode);
        }
    }

    DisconnectAll(): void {
        for (const [lobbyCode, conn] of this.connections) {
            conn.Disconnect();
            this.connections.delete(lobbyCode);
        }
    }

    GetLobbyStatus(lobbyCode: string): { isActive: boolean; isConnected: boolean } | undefined {
        const conn = this.connections.get(lobbyCode);
        if (!conn) return undefined;
        return { isActive: conn.IsActive(), isConnected: conn.IsConnected() };
    }

    GetAllLobbyCodes(): string[] {
        return Array.from(this.connections.keys());
    }
}
