import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BotsModule } from './bots/bots.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { IdentityModule } from './identity/identity.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { ListingsModule } from './listings/listings.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [DatabaseModule, IdentityModule, AuthModule, BotsModule, RealtimeModule, ListingsModule, IngestionModule],
  controllers: [HealthController],
})
export class AppModule {}
