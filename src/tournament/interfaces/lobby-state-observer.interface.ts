import { LobbyStatePayload } from '@syncstart/index';

export interface ILobbyStateObserver {
    OnLobbyStateChanged(tournamentId: number, lobbyState: LobbyStatePayload, lobbyCode: string, lobbyName: string): Promise<void>;
    OnLobbyDisconnected?(tournamentId: number, lobbyCode: string): void;
}
