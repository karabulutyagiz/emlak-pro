import { Controller, Get, Query } from '@nestjs/common';
import { IdentityService } from './identity.service';

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('preview-public-ids')
  previewPublicIds(@Query('size') size?: string) {
    const parsedSize = Number(size ?? 5);

    return {
      data: this.identityService.previewBatch(Number.isFinite(parsedSize) ? Math.min(Math.max(parsedSize, 1), 20) : 5),
    };
  }
}
