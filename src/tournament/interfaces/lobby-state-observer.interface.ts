import { LobbyStatePayload } from '../itg-online.types';

export interface ILobbyStateObserver {
    OnLobbyStateChanged(tournamentId: number, lobbyState: LobbyStatePayload, lobbyId: string, lobbyName: string): Promise<void>;
    OnLobbyDisconnected?(tournamentId: number, lobbyId: string): void;
}
