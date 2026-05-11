import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IdentityService } from '../identity/identity.service';
import { AuthenticatedUser } from './authenticated-user.type';
import { CompletePasswordSetupDto } from './dto/complete-password-setup.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identityService: IdentityService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Bu e-posta ile kayıtlı bir hesap zaten var.');
    }

    const user = await this.prisma.user.create({
      data: {
        publicId: await this.generateUniquePublicId(),
        email: dto.email.toLowerCase(),
        displayName: dto.displayName.trim(),
        passwordHash: this.hashPassword(dto.password),
      },
      select: {
        id: true,
        publicId: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    const session = await this.createSession(user.id, userAgent);

    return {
      user,
      session,
    };
  }

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        publicId: true,
        email: true,
        displayName: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user || !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const session = await this.createSession(user.id, userAgent);

    return {
      user: {
        id: user.id,
        publicId: user.publicId,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      session,
    };
  }

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        publicId: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    return user;
  }

  async validatePasswordSetupToken(token?: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Gecerli bir token gerekli.');
    }

    const record = await this.prisma.passwordSetupToken.findUnique({
      where: { token: token.trim() },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException('Sifre olusturma linki gecersiz veya suresi dolmus.');
    }

    return {
      email: record.user.email,
      displayName: record.user.displayName,
      role: record.user.role,
      expiresAt: record.expiresAt,
    };
  }

  async completePasswordSetup(dto: CompletePasswordSetupDto) {
    const token = dto.token.trim();

    const record = await this.prisma.passwordSetupToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            publicId: true,
            email: true,
            displayName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException('Sifre olusturma linki gecersiz veya suresi dolmus.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: this.hashPassword(dto.password),
        },
      }),
      this.prisma.passwordSetupToken.update({
        where: { id: record.id },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    const session = await this.createSession(record.userId);

    return {
      user: record.user,
      session,
    };
  }

  private async generateUniquePublicId() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const publicId = this.identityService.generatePublicUserId();
      const existing = await this.prisma.user.findUnique({
        where: { publicId },
        select: { id: true },
      });

      if (!existing) {
        return publicId;
      }
    }

    throw new ConflictException('Benzersiz kullanıcı ID oluşturulamadı. Lütfen tekrar deneyin.');
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string) {
    const [salt, hash] = storedHash.split(':');
    const candidate = scryptSync(password, salt, 64);
    return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
  }

  private async createSession(userId: string, userAgent?: string) {
    const token = randomBytes(32).toString('hex');
    const session = await this.prisma.authSession.create({
      data: {
        userId,
        token,
        userAgent,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
      select: {
        token: true,
        expiresAt: true,
      },
    });

    return session;
  }
}
