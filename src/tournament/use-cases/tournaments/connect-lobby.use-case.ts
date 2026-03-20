import { Injectable } from '@nestjs/common';
import { LobbyManager } from '../../services/lobby-manager.service';

@Injectable()
export class ConnectLobbyUseCase {
    constructor(private readonly lobbyManager: LobbyManager) {}

    async execute(
        tournamentId: number,
        lobbyCode: string,
        password: string,
        name?: string,
    ): Promise<string> {
        return this.lobbyManager.ConnectLobby(tournamentId, name || lobbyCode, lobbyCode, password);
    }
}
