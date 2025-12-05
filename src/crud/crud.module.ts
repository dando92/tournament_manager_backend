import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Controllers } from './controllers';
import { Services } from './services';
import { Entities } from './entities';

@Module(
    {
        imports: [
            TypeOrmModule.forRoot({
                type: 'sqlite',
                database: 'tournament.db',
                entities: Entities,
                synchronize: true,
            }),
            TypeOrmModule.forFeature(Entities),
        ],
        controllers: Controllers,
        providers: Services,
        exports: Services
    })
export class CrudModule { }