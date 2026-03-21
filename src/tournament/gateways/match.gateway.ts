import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocket, Server as WsServer } from 'ws';
import { Match } from '@persistence/entities';
import { GetTournamentByDivisionUseCase } from '../use-cases/tournaments/get-tournament-by-division.use-case';

@WebSocketGateway({
  path: "/matchupdatehub",
  cors: {
    origin: '*',
  },
})
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: WsServer;

  constructor(private readonly getTournamentByDivisionUseCase: GetTournamentByDivisionUseCase) {}

  handleConnection(client: WebSocket) {
    console.log(`Client connected to match gateway`);
  }

  handleDisconnect(client: WebSocket) {
    console.log(`Client disconnected from match gateway`);
  }

  private broadcast(event: string, data: unknown) {
    const msg = JSON.stringify({ event, data });
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  async OnMatchUpdate(match: Match) {
    if (!match) {
      return;
    }

    const division = await match.division;
    const tournament = await this.getTournamentByDivisionUseCase.execute(division.id);

    const msg = { matchId: match.id, divisionId: division.id, tournamentId: tournament?.id };

    this.broadcast('OnMatchUpdate', msg);
    delete match.division;
  }
}
