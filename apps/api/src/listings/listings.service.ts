import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ListingLifecycle } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpdateListingStateDto } from '../listing-state/dto/update-listing-state.dto';
import { CreateNoteDto } from '../notes/dto/create-note.dto';
import { CreateListingDto } from './create-listing.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  list() {
    return this.prisma.listing.findMany({
      orderBy: { lastSeenAt: 'desc' },
      include: {
        matches: {
          select: {
            botId: true,
            userId: true,
            matchedAt: true,
          },
        },
      },
    });
  }

  listForUser(userId: string) {
    return this.prisma.listing.findMany({
      where: {
        matches: {
          some: {
            userId,
          },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
      include: {
        matches: {
          where: { userId },
          select: {
            botId: true,
            userId: true,
            matchedAt: true,
          },
        },
        states: {
          where: { userId },
          select: {
            isFavorite: true,
            status: true,
            lastViewedAt: true,
          },
        },
      },
    });
  }

  async getDetailForUser(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id: listingId,
        matches: {
          some: { userId },
        },
      },
      include: {
        matches: {
          where: { userId },
          select: {
            botId: true,
            matchedAt: true,
          },
        },
        states: {
          where: { userId },
        },
        notes: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    await this.prisma.userListingState.upsert({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
      update: {
        lastViewedAt: new Date(),
      },
      create: {
        userId,
        listingId,
        lastViewedAt: new Date(),
      },
    });

    return listing;
  }

  async create(dto: CreateListingDto) {
    const existing = await this.prisma.listing.findUnique({
      where: {
        source_sourceListingId: {
          source: dto.source,
          sourceListingId: dto.sourceListingId,
        },
      },
    });

    const data: Prisma.ListingUncheckedCreateInput = {
      source: dto.source,
      sourceListingId: dto.sourceListingId,
      title: dto.title,
      canonicalUrl: dto.canonicalUrl,
      city: dto.city,
      district: dto.district,
      neighborhood: dto.neighborhood,
      price: dto.price,
      currency: dto.currency,
      roomCount: dto.roomCount,
      grossAreaM2: dto.grossAreaM2,
      description: dto.description,
      primaryImageUrl: dto.primaryImageUrl,
      mediaUrls: dto.mediaUrls ?? [],
      lifecycle: ListingLifecycle.NEW,
    };

    const listing = existing
      ? await this.prisma.listing.update({
          where: { id: existing.id },
          data: {
            ...data,
            lifecycle: existing.price !== dto.price ? ListingLifecycle.PRICE_CHANGED : ListingLifecycle.UPDATED,
            lastSeenAt: new Date(),
          },
          include: {
            matches: {
              select: {
                botId: true,
                userId: true,
                matchedAt: true,
              },
            },
          },
        })
      : await this.prisma.listing.create({
          data,
          include: {
            matches: {
              select: {
                botId: true,
                userId: true,
                matchedAt: true,
              },
            },
          },
        });

    const matches = await this.matchListingToBots(listing.id);

    this.realtimeGateway.publishListingCreated({
      ...listing,
      matches,
    });

    for (const match of matches) {
      this.realtimeGateway.publishListingCreatedForUser(match.userId, {
        ...listing,
        match,
      });
    }

    return listing;
  }

  async updateUserState(userId: string, listingId: string, dto: UpdateListingStateDto) {
    await this.ensureUserHasAccess(userId, listingId);

    return this.prisma.userListingState.upsert({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
      update: {
        ...(typeof dto.isFavorite === 'boolean' ? { isFavorite: dto.isFavorite } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      create: {
        userId,
        listingId,
        isFavorite: dto.isFavorite ?? false,
        status: dto.status,
      },
    });
  }

  async createNote(userId: string, listingId: string, dto: CreateNoteDto) {
    await this.ensureUserHasAccess(userId, listingId);

    return this.prisma.note.create({
      data: {
        userId,
        listingId,
        body: dto.body.trim(),
      },
    });
  }

  private async ensureUserHasAccess(userId: string, listingId: string) {
    const match = await this.prisma.listingMatch.findFirst({
      where: {
        userId,
        listingId,
      },
      select: { id: true },
    });

    if (!match) {
      throw new NotFoundException('Ilan bulunamadi.');
    }
  }

  private async matchListingToBots(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return [];
    }

    const bots = await this.prisma.bot.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        city: true,
        district: true,
        neighborhood: true,
        minPrice: true,
        maxPrice: true,
        roomCount: true,
        minAreaM2: true,
        maxAreaM2: true,
        keywords: true,
        excludedKeywords: true,
      },
    });

    const normalizedText = `${listing.title} ${listing.description ?? ''}`.toLocaleLowerCase('tr-TR');
    const matchedBots = bots.filter((bot) => {
      if (bot.city && bot.city !== listing.city) return false;
      if (bot.district && bot.district !== listing.district) return false;
      if (bot.neighborhood && bot.neighborhood !== listing.neighborhood) return false;
      if (typeof bot.minPrice === 'number' && typeof listing.price === 'number' && listing.price < bot.minPrice) return false;
      if (typeof bot.maxPrice === 'number' && typeof listing.price === 'number' && listing.price > bot.maxPrice) return false;
      if (bot.roomCount && bot.roomCount !== listing.roomCount) return false;
      if (typeof bot.minAreaM2 === 'number' && typeof listing.grossAreaM2 === 'number' && listing.grossAreaM2 < bot.minAreaM2) return false;
      if (typeof bot.maxAreaM2 === 'number' && typeof listing.grossAreaM2 === 'number' && listing.grossAreaM2 > bot.maxAreaM2) return false;
      if (bot.keywords.length > 0 && !bot.keywords.some((keyword) => normalizedText.includes(keyword.toLocaleLowerCase('tr-TR')))) return false;
      if (bot.excludedKeywords.some((keyword) => normalizedText.includes(keyword.toLocaleLowerCase('tr-TR')))) return false;
      return true;
    });

    const results = [] as Array<{ userId: string; botId: string; matchedAt: Date }>;

    for (const bot of matchedBots) {
      const match = await this.prisma.listingMatch.upsert({
        where: {
          listingId_userId_botId: {
            listingId,
            userId: bot.userId,
            botId: bot.id,
          },
        },
        update: {
          matchedAt: new Date(),
        },
        create: {
          listingId,
          userId: bot.userId,
          botId: bot.id,
        },
        select: {
          userId: true,
          botId: true,
          matchedAt: true,
        },
      });

      await this.prisma.userListingState.upsert({
        where: {
          userId_listingId: {
            userId: bot.userId,
            listingId,
          },
        },
        update: {},
        create: {
          userId: bot.userId,
          listingId,
        },
      });

      results.push(match);
    }

    return results;
  }
}
