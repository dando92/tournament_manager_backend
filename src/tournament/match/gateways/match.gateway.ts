import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocket, Server as WsServer } from 'ws';
import { Match } from '@persistence/entities';
import { TournamentService } from '@tournament/services/tournament.service';

@WebSocketGateway({
  path: "/matchupdatehub",
  cors: {
    origin: '*',
  },
})
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: WsServer;

  constructor(private readonly tournamentService: TournamentService) {}

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

    const phaseId = (await match.phase)?.id;
    const tournament = phaseId ? await this.tournamentService.findByPhase(phaseId) : null;

    const msg = { matchId: match.id, phaseId, tournamentId: tournament?.id };

    this.broadcast('OnMatchUpdate', msg);
  }
}
