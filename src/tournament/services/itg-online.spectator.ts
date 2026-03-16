import { WebSocket } from 'ws';
import { ILobbyStateObserver } from '../interfaces/lobby-state-observer.interface';
import { LobbyStatePayload } from '../itg-online.types';

export class ItgOnlineSpectator {
    private connectionStarted = false;
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
        this._closeCurrentConnection();
        return this._connect();
    }

    Disconnect(): void {
        this.connectionStarted = false;
        this._clearReconnectTimer();
        this._closeCurrentConnection();
    }

    IsConnected(): boolean {
        return this.connectionStarted;
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

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            let settled = false;

            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);

            ws.on('open', () => {
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
                    return;
                }

                if (payload.event === 'lobbyState') {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timeout);
                        this.ws = ws;
                        resolve();
                    }
                    await this._notifyObservers(payload.data as LobbyStatePayload);
                }
            });

            ws.on('close', () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(new Error('Connection refused — check lobby code and password'));
                }
                if (this.connectionStarted) {
                    console.log(`[ItgOnlineSpectator] Connection lost for tournament ${this.tournamentId}, reconnecting in 5s...`);
                    this.ws = null;
                    this._clearReconnectTimer();
                    this.reconnectTimer = setTimeout(() => this._connect().catch(console.error), 5000);
                }
            });

            ws.on('error', (err) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(err);
                }
            });
        });
    }

    private async _notifyObservers(lobbyState: LobbyStatePayload): Promise<void> {
        for (const observer of this.observers) {
            await observer.OnLobbyStateChanged(this.tournamentId, lobbyState, this.lobbyId, this.lobbyName);
        }
    }
}
