import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ListingsService } from '../listings/listings.service';
import { SahibindenRawListingDto } from './dto/sahibinden-raw-listing.dto';
import { InternalIngestionGuard } from './internal-ingestion.guard';
import { SahibindenAdapterService } from './sahibinden-adapter.service';

@Controller('internal/ingestion')
@UseGuards(InternalIngestionGuard)
export class IngestionController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly sahibindenAdapter: SahibindenAdapterService,
  ) {}

  @Get('sources/sahibinden/sample')
  getSamplePayload() {
    const raw = this.sahibindenAdapter.samplePayload();
    return {
      data: {
        raw,
        normalized: this.sahibindenAdapter.normalize(raw),
      },
    };
  }

  @Post('sources/sahibinden/listings')
  async ingestSahibindenListing(@Body() dto: SahibindenRawListingDto) {
    const normalized = this.sahibindenAdapter.normalize(dto);
    const listing = await this.listingsService.create(normalized);

    return {
      data: listing,
      meta: {
        source: 'sahibinden',
        normalized: true,
      },
    };
  }

  @Get('sources/sahibinden/pull')
  async pullLatestFromSahibinden(@Query('path') searchPath = '/kiralik-daire/istanbul-kadikoy') {
    let result = await this.sahibindenAdapter.fetchLatest(searchPath);

    if (result.blocked) {
      result = await this.sahibindenAdapter.fetchLatestWithBrowser(searchPath);
    }

    this.sahibindenAdapter.ensureNotBlocked(result);

    const created = [];
    for (const raw of result.listings) {
      const normalized = this.sahibindenAdapter.normalize(raw);
      created.push(await this.listingsService.create(normalized));
    }

    return {
      data: {
        sourceUrl: result.sourceUrl,
        importedCount: created.length,
        listings: created,
      },
    };
  }

  @Get('sources/sahibinden/preview')
  async previewLatestFromSahibinden(@Query('path') searchPath = '/kiralik-daire/istanbul-kadikoy') {
    const result = await this.sahibindenAdapter.fetchLatest(searchPath);

    return {
      data: result,
    };
  }

  @Get('sources/sahibinden/preview-browser')
  async previewLatestFromSahibindenWithBrowser(@Query('path') searchPath = '/kiralik-daire/istanbul-kadikoy') {
    const result = await this.sahibindenAdapter.fetchLatestWithBrowser(searchPath);

    return {
      data: result,
    };
  }
}
