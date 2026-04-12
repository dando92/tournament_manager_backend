import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Participant } from "@persistence/entities";

@Injectable()
export class TournamentAccessGuard implements CanActivate {
    constructor(
        @InjectRepository(Participant)
        private participantRepo: Repository<Participant>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) return false;
        if (user.isAdmin) return true;

        const tournamentId = Number(request.params.id);
        if (isNaN(tournamentId)) return false;

        const participant = await this.participantRepo.findOne({
            where: { tournament: { id: tournamentId }, account: { id: user.id } },
        });

        return participant?.roles?.includes('staff') ?? false;
    }
}
