import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from './authenticated-user.type';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token gerekli.');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Gecersiz token.');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            publicId: true,
            email: true,
            displayName: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Oturum gecersiz veya suresi dolmus.');
    }

    request.user = session.user satisfies AuthenticatedUser;
    request.session = {
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
    };

    return true;
  }
}
