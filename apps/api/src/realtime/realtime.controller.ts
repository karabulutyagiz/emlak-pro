import { Controller, Get } from '@nestjs/common';

@Controller('realtime')
export class RealtimeController {
  @Get('info')
  getInfo() {
    return {
      data: {
        namespace: '/realtime',
        events: ['system.connected', 'feed.subscribe', 'listing.created'],
      },
    };
  }
}
