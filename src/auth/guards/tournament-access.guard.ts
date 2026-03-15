import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Tournament } from "@persistence/entities";


@Injectable()
export class TournamentAccessGuard implements CanActivate {
    constructor(
        @InjectRepository(Tournament)
        private tournamentRepo: Repository<Tournament>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) return false;

        if (user.isAdmin) {
            return true;
        }

        const tournamentId = Number(request.params.id);
        if (isNaN(tournamentId)) return false;

        const tournament = await this.tournamentRepo.findOne({
            where: { id: tournamentId },
            relations: ['helpers', 'owner'],
        });

        if (!tournament) return false;

        if (tournament.owner?.id === user.id) return true;

        return tournament.helpers?.some(h => h.id === user.id) ?? false;
    }
}
