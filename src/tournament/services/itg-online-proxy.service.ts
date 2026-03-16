import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StandingManager } from './standing.manager';
import { ItgOnlineProxyGateway } from '../gateways/itg-online-proxy.gateway';
import { ItgOnlineSpectator } from './itg-online.spectator';

interface LobbyEntry {
    id: string;
    name: string;
    lobbyCode: string;
    spectator: ItgOnlineSpectator;
}

@Injectable()
export class ItgOnlineProxyService {
    private lobbies = new Map<number, Map<string, LobbyEntry>>();

    constructor(
        private readonly standingManager: StandingManager,
        private readonly itgOnlineProxyGateway: ItgOnlineProxyGateway,
    ) {}

    async ConnectLobby(tournamentId: number, name: string, lobbyCode: string, password: string): Promise<string> {
        if (!this.lobbies.has(tournamentId)) {
            this.lobbies.set(tournamentId, new Map());
        }
        const lobbyId = randomUUID();
        const spectator = this._createSpectator(tournamentId, lobbyId, name);
        this.itgOnlineProxyGateway.RegisterLobby(lobbyId, lobbyCode);
        await spectator.Connect(lobbyCode, password);
        this.lobbies.get(tournamentId)!.set(lobbyId, { id: lobbyId, name, lobbyCode, spectator });
        return lobbyId;
    }

    DisconnectLobby(tournamentId: number, lobbyId: string): void {
        const tournamentLobbies = this.lobbies.get(tournamentId);
        if (!tournamentLobbies) return;
        const entry = tournamentLobbies.get(lobbyId);
        if (entry) {
            entry.spectator.Disconnect();
            tournamentLobbies.delete(lobbyId);
        }
        this.itgOnlineProxyGateway.OnLobbyDisconnected(tournamentId, lobbyId);
        if (tournamentLobbies.size === 0) {
            this.lobbies.delete(tournamentId);
        }
    }

    GetLobbies(tournamentId: number): { id: string; name: string; lobbyCode: string }[] {
        const tournamentLobbies = this.lobbies.get(tournamentId);
        if (!tournamentLobbies) return [];
        return Array.from(tournamentLobbies.values()).map(({ id, name, lobbyCode }) => ({ id, name, lobbyCode }));
    }

    private _createSpectator(tournamentId: number, lobbyId: string, lobbyName: string): ItgOnlineSpectator {
        const spectator = new ItgOnlineSpectator(tournamentId, lobbyId, lobbyName);
        spectator.AddObserver(this.standingManager);
        spectator.AddObserver(this.itgOnlineProxyGateway);
        return spectator;
    }
}
