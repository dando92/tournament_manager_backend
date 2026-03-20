import { Injectable } from '@nestjs/common';
import { LobbyManager } from '../../services/lobby-manager.service';

@Injectable()
export class DisconnectLobbyUseCase {
    constructor(private readonly lobbyManager: LobbyManager) {}

    execute(tournamentId: number, lobbyId: string): void {
        this.lobbyManager.DisconnectLobby(tournamentId, lobbyId);
    }
}
