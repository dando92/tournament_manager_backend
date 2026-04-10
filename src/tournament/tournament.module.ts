import { Module } from '@nestjs/common';
import { PersistenceModule } from '@persistence/persistence.module';
import { SyncStartModule } from '@syncstart/index';
import { Services } from './services';
import { Controllers } from './controllers';
import { Gateways } from './gateways';
import { TournamentAccessGuard, TournamentOwnershipGuard, AdminGuard, CreatorOrAdminGuard } from '@auth/guards';

@Module({
    imports: [
        PersistenceModule,
        SyncStartModule
    ],
    providers: [...Gateways, ...Services, TournamentAccessGuard, TournamentOwnershipGuard, AdminGuard, CreatorOrAdminGuard],
    controllers: [...Controllers]
})
export class TournamentModule {}
