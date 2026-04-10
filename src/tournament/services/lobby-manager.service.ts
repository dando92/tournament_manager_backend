import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '@persistence/entities';
import { LobbyStatePayload, SyncStartConnector } from '@syncstart/index';
import { StandingManager } from '../standing/standing.manager';
import { ItgOnlineProxyGateway } from '../gateways/itg-online-proxy.gateway';

interface LobbyMeta {
    tournamentId: number;
    lobbyId: string;
    lobbyName: string;
}

@Injectable()
export class LobbyManager implements OnModuleInit {
    // One SyncStartConnector per tournament
    private connectors = new Map<number, SyncStartConnector>();

    // lobbyCode → lobby metadata (lobbyId is the lobbyCode)
    private lobbyCodeMeta = new Map<string, LobbyMeta>();

    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentRepository: Repository<Tournament>,
        private readonly standingManager: StandingManager,
        private readonly gateway: ItgOnlineProxyGateway,
    ) {}

    async onModuleInit(): Promise<void> {
        const tournaments = await this.tournamentRepository.find();
        for (const tournament of tournaments) {
            if (tournament.syncstartUrl) {
                this._createConnector(tournament.id, tournament.syncstartUrl);
                console.log(`[LobbyManager] Created connector for tournament=${tournament.id} url=${tournament.syncstartUrl}`);
            }
        }
    }

    async ConnectLobby(tournamentId: number, name: string, lobbyCode: string, password: string): Promise<string> {
        const connector = this.connectors.get(tournamentId);
        if (!connector) {
            throw new Error(`No SyncStart connector for tournament=${tournamentId}. Ensure the tournament has a syncstartUrl set.`);
        }

        try {
            const { lobbyCode: resolvedLobbyCode, initialState } = await connector.ConnectLobby(lobbyCode, password);
            const lobbyId = resolvedLobbyCode;
            this.lobbyCodeMeta.set(resolvedLobbyCode, { tournamentId, lobbyId, lobbyName: name });
            this.gateway.RegisterLobby(tournamentId, lobbyId, name, resolvedLobbyCode);
            await this._notifyLobbyState(resolvedLobbyCode, initialState);
            console.log(`[LobbyManager] ConnectLobby succeeded (tournament=${tournamentId} lobbyCode=${resolvedLobbyCode} lobbyId=${lobbyId})`);
            return lobbyId;
        } catch (err) {
            console.error(`[LobbyManager] ConnectLobby failed (tournament=${tournamentId} lobbyCode=${lobbyCode}): ${err?.message ?? err}`);
            throw err;
        }
    }

    async CreateLobby(tournamentId: number, name: string, password: string): Promise<{ lobbyId: string; lobbyCode: string }> {
        const connector = this.connectors.get(tournamentId);
        if (!connector) {
            throw new Error(`No SyncStart connector for tournament=${tournamentId}. Ensure the tournament has a syncstartUrl set.`);
        }

        const { lobbyCode, initialState } = await connector.CreateLobby(password);
        const lobbyId = lobbyCode;
        const lobbyName = name || lobbyCode;
        this.lobbyCodeMeta.set(lobbyCode, { tournamentId, lobbyId, lobbyName });
        this.gateway.RegisterLobby(tournamentId, lobbyId, lobbyName, lobbyCode);
        await this._notifyLobbyState(lobbyCode, initialState);
        console.log(`[LobbyManager] CreateLobby succeeded (tournament=${tournamentId} lobbyCode=${lobbyCode} lobbyId=${lobbyId})`);
        return { lobbyId, lobbyCode };
    }

    DisconnectLobby(tournamentId: number, lobbyId: string): void {
        const lobbyCode = lobbyId.toUpperCase();
        const meta = this.lobbyCodeMeta.get(lobbyCode);
        if (!meta || meta.tournamentId !== tournamentId) return;

        const connector = this.connectors.get(tournamentId);
        connector?.DisconnectLobby(lobbyCode);
        this.lobbyCodeMeta.delete(lobbyCode);
        this.gateway.OnLobbyDisconnected(tournamentId, lobbyCode);
    }

    OnTournamentCreated(tournamentId: number, syncstartUrl: string): void {
        this._createConnector(tournamentId, syncstartUrl);
        console.log(`[LobbyManager] Created connector for new tournament=${tournamentId} url=${syncstartUrl}`);
    }

    OnTournamentUrlChanged(tournamentId: number, newUrl: string): void {
        this._disconnectAllForTournament(tournamentId);
        this._createConnector(tournamentId, newUrl);
        console.log(`[LobbyManager] URL changed for tournament=${tournamentId}, new connector created (no lobbies connected)`);
    }

    GetLobbies(tournamentId: number): { id: string; name: string; lobbyCode: string; isActive: boolean; isConnected: boolean }[] {
        const connector = this.connectors.get(tournamentId);
        const result: { id: string; name: string; lobbyCode: string; isActive: boolean; isConnected: boolean }[] = [];
        for (const [lobbyCode, meta] of this.lobbyCodeMeta) {
            if (meta.tournamentId !== tournamentId) continue;
            const status = connector?.GetLobbyStatus(lobbyCode) ?? { isActive: false, isConnected: false };
            result.push({ id: meta.lobbyId, name: meta.lobbyName, lobbyCode, ...status });
        }
        return result;
    }

    private _createConnector(tournamentId: number, syncstartUrl: string): void {
        const connector = new SyncStartConnector(
            syncstartUrl,
            (lobbyCode, payload) => this._onLobbyState(lobbyCode, payload),
            (lobbyCode) => this._onForcedDisconnect(lobbyCode),
        );
        this.connectors.set(tournamentId, connector);
    }

    private async _onLobbyState(lobbyCode: string, payload: LobbyStatePayload): Promise<void> {
        await this._notifyLobbyState(lobbyCode, payload);
    }

    private async _notifyLobbyState(lobbyCode: string, payload: LobbyStatePayload): Promise<void> {
        const meta = this.lobbyCodeMeta.get(lobbyCode);
        if (!meta) return;
        const { tournamentId, lobbyName } = meta;
        await this.standingManager.OnLobbyStateChanged(tournamentId, payload, lobbyCode, lobbyName);
        await this.gateway.OnLobbyStateChanged(tournamentId, payload, lobbyCode, lobbyName);
    }

    private _onForcedDisconnect(lobbyCode: string): void {
        const meta = this.lobbyCodeMeta.get(lobbyCode);
        if (!meta) return;
        const { tournamentId } = meta;
        this.lobbyCodeMeta.delete(lobbyCode);
        this.gateway.OnLobbyDisconnected(tournamentId, lobbyCode);
        console.log(`[LobbyManager] Forced disconnect for lobbyCode=${lobbyCode} tournament=${tournamentId}`);
    }

    private _disconnectAllForTournament(tournamentId: number): void {
        const connector = this.connectors.get(tournamentId);
        if (!connector) return;

        for (const [lobbyCode, meta] of this.lobbyCodeMeta) {
            if (meta.tournamentId !== tournamentId) continue;
            connector.DisconnectLobby(lobbyCode);
            this.gateway.OnLobbyDisconnected(tournamentId, lobbyCode);
            this.lobbyCodeMeta.delete(lobbyCode);
        }
        this.connectors.delete(tournamentId);
    }

}
