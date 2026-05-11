import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { BotsService } from './bots.service';
import { CreateBotDto } from './create-bot.dto';

@Controller('bots')
@UseGuards(SessionAuthGuard)
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get()
  async listBots(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.botsService.list(user.id) };
  }

  @Post()
  async createBot(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBotDto) {
    return { data: await this.botsService.create(user.id, dto) };
  }
}
