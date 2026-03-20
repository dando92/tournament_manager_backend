import { WebSocket } from 'ws';
import { ILobbyStateObserver } from '../interfaces/lobby-state-observer.interface';
import { LobbyStatePayload } from '../itg-online.types';

export class ItgOnlineSpectator {
    private connectionStarted = false;
    private connected = false;
    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private observers: ILobbyStateObserver[] = [];
    private lobbyCode = '';
    private password = '';

    constructor(
        private readonly tournamentId: number,
        private readonly lobbyId: string,
        private readonly lobbyName: string,
    ) {}

    async Connect(lobbyCode: string, password: string): Promise<void> {
        this.lobbyCode = lobbyCode;
        this.password = password;
        this.connectionStarted = true;
        console.log(`[ItgOnlineSpectator] Connecting tournament=${this.tournamentId} lobbyCode=${lobbyCode} url=${process.env.ITG_ONLINE_WS_URL ?? '(not set)'}`);
        this._closeCurrentConnection();
        return this._connect();
    }

    Disconnect(): void {
        this.connectionStarted = false;
        this.connected = false;
        this._clearReconnectTimer();
        this._closeCurrentConnection();
    }

    /** True when connection intent is active (will reconnect on drop). */
    IsActive(): boolean {
        return this.connectionStarted;
    }

    /** True when the WebSocket is currently open and receiving data. */
    IsConnected(): boolean {
        return this.connected;
    }

    AddObserver(observer: ILobbyStateObserver): void {
        this.observers.push(observer);
    }

    RemoveObserver(observer: ILobbyStateObserver): void {
        this.observers = this.observers.filter(o => o !== observer);
    }

    ClearObservers(): void {
        this.observers = [];
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
        const url = process.env.ITG_ONLINE_WS_URL;
        if (!url) return Promise.reject(new Error('ITG_ONLINE_WS_URL not configured'));

        console.log(`[ItgOnlineSpectator] Opening WebSocket to ${url} (tournament=${this.tournamentId} lobbyCode=${this.lobbyCode})`);

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            let settled = false;

            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    console.warn(`[ItgOnlineSpectator] Connection timed out after 10s (tournament=${this.tournamentId} url=${url})`);
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);

            ws.on('open', () => {
                console.log(`[ItgOnlineSpectator] WebSocket open, sending spectateLobby (tournament=${this.tournamentId} lobbyCode=${this.lobbyCode})`);
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
                    console.warn(`[ItgOnlineSpectator] Received unparseable message (tournament=${this.tournamentId}): ${data.toString().slice(0, 200)}`);
                    return;
                }

                console.log(`[ItgOnlineSpectator] Received event="${payload.event}" (tournament=${this.tournamentId})`);

                if (payload.event === 'lobbyState') {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timeout);
                        console.log(`[ItgOnlineSpectator] Connected and receiving lobbyState (tournament=${this.tournamentId} lobbyCode=${this.lobbyCode})`);
                        this.ws = ws;
                        this.connected = true;
                        resolve();
                    }
                    await this._notifyLobbyState(payload.data as LobbyStatePayload);
                } else if (payload.event === 'clientDisconnected') {
                    // Server is forcibly disconnecting us — do not reconnect
                    if (this.connectionStarted) {
                        const reason = (payload.data as { reason?: string })?.reason ?? '(no reason)';
                        console.warn(`[ItgOnlineSpectator] clientDisconnected received — reason="${reason}" (tournament=${this.tournamentId}). Will not reconnect.`);
                        this.connectionStarted = false;
                        this.connected = false;
                        this._clearReconnectTimer();
                        this._closeCurrentConnection();
                        this._notifyObserversDisconnected();
                    }
                }
            });

            ws.on('close', (code, reason) => {
                const reasonStr = reason?.toString() || '(no reason)';
                this.connected = false;
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    console.error(`[ItgOnlineSpectator] Connection closed before lobbyState received — code=${code} reason=${reasonStr} (tournament=${this.tournamentId} lobbyCode=${this.lobbyCode})`);
                    reject(new Error(`Connection refused — code=${code} reason=${reasonStr}`));
                } else {
                    console.warn(`[ItgOnlineSpectator] Connection closed — code=${code} reason=${reasonStr} (tournament=${this.tournamentId})`);
                }
                if (this.connectionStarted) {
                    console.log(`[ItgOnlineSpectator] Scheduling reconnect in 5s (tournament=${this.tournamentId})`);
                    this.ws = null;
                    this._clearReconnectTimer();
                    this.reconnectTimer = setTimeout(() => this._connect().catch(err =>
                        console.error(`[ItgOnlineSpectator] Reconnect failed (tournament=${this.tournamentId}): ${err?.message ?? err}`)
                    ), 5000);
                }
            });

            ws.on('error', (err) => {
                console.error(`[ItgOnlineSpectator] WebSocket error (tournament=${this.tournamentId} url=${url}): ${err?.message ?? err}`);
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(err);
                }
            });
        });
    }

    private async _notifyLobbyState(lobbyState: LobbyStatePayload): Promise<void> {
        for (const observer of this.observers) {
            await observer.OnLobbyStateChanged(this.tournamentId, lobbyState, this.lobbyId, this.lobbyName);
        }
    }

    private _notifyObserversDisconnected(): void {
        for (const observer of this.observers) {
            observer.OnLobbyDisconnected?.(this.tournamentId, this.lobbyId);
        }
    }
}
