import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBotDto } from './create-bot.dto';

@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId?: string) {
    return this.prisma.bot.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(userId: string, dto: CreateBotDto) {
    return this.prisma.bot.create({
      data: {
        userId,
        name: dto.name,
        isActive: dto.isActive ?? true,
        city: dto.city,
        district: dto.district,
        neighborhood: dto.neighborhood,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        roomCount: dto.roomCount,
        minAreaM2: dto.minAreaM2,
        maxAreaM2: dto.maxAreaM2,
        keywords: dto.keywords ?? [],
        excludedKeywords: dto.excludedKeywords ?? [],
      },
    });
  }
}
