import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { UpdateListingStateDto } from '../listing-state/dto/update-listing-state.dto';
import { CreateNoteDto } from '../notes/dto/create-note.dto';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './create-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  async listListings(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.listingsService.listForUser(user.id) };
  }

  @Post()
  async createListing(@Body() dto: CreateListingDto) {
    return { data: await this.listingsService.create(dto) };
  }

  @Get(':listingId')
  @UseGuards(SessionAuthGuard)
  async getListingDetail(@CurrentUser() user: AuthenticatedUser, @Param('listingId') listingId: string) {
    return { data: await this.listingsService.getDetailForUser(user.id, listingId) };
  }

  @Patch(':listingId/state')
  @UseGuards(SessionAuthGuard)
  async updateListingState(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingStateDto,
  ) {
    return { data: await this.listingsService.updateUserState(user.id, listingId, dto) };
  }

  @Post(':listingId/notes')
  @UseGuards(SessionAuthGuard)
  async createNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return { data: await this.listingsService.createNote(user.id, listingId, dto) };
  }
}
