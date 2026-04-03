import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocket, Server as WsServer } from 'ws';
import { InjectRepository } from '@nestjs/typeorm';
import { Division, Match, Phase } from '@persistence/entities';
import { Repository } from 'typeorm';

type TournamentUpdatePayload = {
  tournamentId: number;
};

type DivisionUpdatePayload = {
  tournamentId: number;
  divisionId: number;
};

type PhaseUpdatePayload = {
  tournamentId: number;
  divisionId: number;
  phaseId: number;
};

type MatchUpdatePayload = {
  tournamentId: number;
  divisionId: number;
  phaseId: number;
  matchId: number;
};

@WebSocketGateway({
  path: "/uiupdatehub",
  cors: {
    origin: '*',
  },
})
export class UiUpdateGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: WsServer;

  constructor(
    @InjectRepository(Division)
    private readonly divisionRepository: Repository<Division>,
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  handleConnection(_client: WebSocket) {
    console.log(`Client connected to ui update gateway`);
  }

  handleDisconnect(_client: WebSocket) {
    console.log(`Client disconnected from ui update gateway`);
  }

  private broadcast(event: string, data: unknown) {
    const msg = JSON.stringify({ event, data });
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  async emitTournamentUpdate(tournamentId: number | null | undefined) {
    if (!tournamentId) return;

    const msg: TournamentUpdatePayload = { tournamentId };
    this.broadcast('TournamentUpdate', msg);
  }

  async emitDivisionUpdateByDivisionId(divisionId: number | null | undefined) {
    if (!divisionId) return;

    const data = await this.divisionRepository
      .createQueryBuilder('division')
      .leftJoin('division.tournament', 'tournament')
      .select('tournament.id', 'tournamentId')
      .addSelect('division.id', 'divisionId')
      .where('division.id = :divisionId', { divisionId })
      .getRawOne<DivisionUpdatePayload>();

    if (!data?.tournamentId || !data?.divisionId) return;

    const payload: DivisionUpdatePayload = {
      tournamentId: Number(data.tournamentId),
      divisionId: Number(data.divisionId),
    };

    this.broadcast('DivisionUpdate', payload);
  }

  async emitPhaseUpdateByPhaseId(phaseId: number | null | undefined) {
    if (!phaseId) return;

    const data = await this.phaseRepository
      .createQueryBuilder('phase')
      .leftJoin('phase.division', 'division')
      .leftJoin('division.tournament', 'tournament')
      .select('tournament.id', 'tournamentId')
      .addSelect('division.id', 'divisionId')
      .addSelect('phase.id', 'phaseId')
      .where('phase.id = :phaseId', { phaseId })
      .getRawOne<PhaseUpdatePayload>();

    if (!data?.tournamentId || !data?.divisionId || !data?.phaseId) return;

    const payload: PhaseUpdatePayload = {
      tournamentId: Number(data.tournamentId),
      divisionId: Number(data.divisionId),
      phaseId: Number(data.phaseId),
    };

    this.broadcast('PhaseUpdate', payload);
  }

  async emitMatchUpdateByMatchId(matchId: number | null | undefined) {
    if (!matchId) return;

    const data = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoin('match.phase', 'phase')
      .leftJoin('phase.division', 'division')
      .leftJoin('division.tournament', 'tournament')
      .select('tournament.id', 'tournamentId')
      .addSelect('division.id', 'divisionId')
      .addSelect('phase.id', 'phaseId')
      .addSelect('match.id', 'matchId')
      .where('match.id = :matchId', { matchId })
      .getRawOne<MatchUpdatePayload>();

    if (!data?.tournamentId || !data?.divisionId || !data?.phaseId || !data?.matchId) return;

    const payload: MatchUpdatePayload = {
      tournamentId: Number(data.tournamentId),
      divisionId: Number(data.divisionId),
      phaseId: Number(data.phaseId),
      matchId: Number(data.matchId),
    };

    this.broadcast('MatchUpdate', payload);
  }
}
