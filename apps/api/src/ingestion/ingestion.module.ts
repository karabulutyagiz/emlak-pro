import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { IngestionController } from './ingestion.controller';
import { InternalIngestionGuard } from './internal-ingestion.guard';
import { SahibindenAdapterService } from './sahibinden-adapter.service';

@Module({
  imports: [ListingsModule],
  controllers: [IngestionController],
  providers: [InternalIngestionGuard, SahibindenAdapterService],
  exports: [SahibindenAdapterService],
})
export class IngestionModule {}
