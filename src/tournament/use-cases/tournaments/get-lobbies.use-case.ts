import { Injectable } from '@nestjs/common';
import { LobbyManager } from '../../services/lobby-manager.service';

@Injectable()
export class GetLobbiesUseCase {
    constructor(private readonly lobbyManager: LobbyManager) {}

    execute(tournamentId: number) {
        return this.lobbyManager.GetLobbies(tournamentId);
    }
}
