import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { UserService } from './services';
import { UserController } from './controllers';
import { PersistenceModule } from '@persistence/persistence.module';
import { AdminGuard, CreatorOrAdminGuard } from '@auth/guards';

@Module({
    imports: [PersistenceModule],
    providers: [UserService, AdminGuard, CreatorOrAdminGuard],
    controllers: [UserController],
    exports: [UserService],
})
export class AccountModule {
  constructor(private datasource: DataSource) { }
}
