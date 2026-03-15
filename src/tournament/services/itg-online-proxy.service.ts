import { Injectable, OnModuleInit } from '@nestjs/common';
import { GetPublicTournamentsUseCase } from '../use-cases/tournaments/get-public-tournaments.use-case';
import { StandingManager } from './standing.manager';
import { ItgOnlineProxyGateway } from '../gateways/itg-online-proxy.gateway';
import { ItgOnlineSpectator } from './itg-online.spectator';

@Injectable()
export class ItgOnlineProxyService implements OnModuleInit {
    private spectators = new Map<number, ItgOnlineSpectator>();

    constructor(
        private readonly getPublicTournamentsUseCase: GetPublicTournamentsUseCase,
        private readonly standingManager: StandingManager,
        private readonly itgOnlineProxyGateway: ItgOnlineProxyGateway,
    ) {}

    async onModuleInit(): Promise<void> {
        const tournaments = await this.getPublicTournamentsUseCase.execute();
        for (const tournament of tournaments) {
            this.spectators.set(tournament.id, this._createSpectator(tournament.id));
        }
    }

    async Connect(tournamentId: number, lobbyCode: string, password: string): Promise<void> {
        const spectator = this._getOrCreateSpectator(tournamentId);
        await spectator.Connect(lobbyCode, password);
    }

    Disconnect(tournamentId: number): void {
        this.spectators.get(tournamentId)?.Disconnect();
        this.itgOnlineProxyGateway.OnLobbyDisconnected(tournamentId);
    }

    IsConnected(tournamentId: number): boolean {
        return this.spectators.get(tournamentId)?.IsConnected() ?? false;
    }

    private _createSpectator(tournamentId: number): ItgOnlineSpectator {
        const spectator = new ItgOnlineSpectator(tournamentId);
        spectator.AddObserver(this.standingManager);
        spectator.AddObserver(this.itgOnlineProxyGateway);
        return spectator;
    }

    private _getOrCreateSpectator(tournamentId: number): ItgOnlineSpectator {
        if (!this.spectators.has(tournamentId)) {
            this.spectators.set(tournamentId, this._createSpectator(tournamentId));
        }
        return this.spectators.get(tournamentId)!;
    }
}
