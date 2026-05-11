import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly prisma: PrismaService) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    client.emit('system.connected', {
      connectionId: client.id,
      connectedAt: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    client.emit('system.disconnected', {
      connectionId: client.id,
      disconnectedAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('feed.subscribe')
  async subscribeToFeed(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId?: string; token?: string },
  ) {
    let room = 'public-feed';

    if (payload.token) {
      const session = await this.prisma.authSession.findUnique({
        where: { token: payload.token },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      if (session && session.expiresAt > new Date()) {
        room = `user:${session.user.id}`;
      }
    } else if (payload.userId) {
      room = `user:${payload.userId}`;
    }

    client.join(room);

    return {
      event: 'feed.subscribed',
      data: {
        room,
        subscribedAt: new Date().toISOString(),
      },
    };
  }

  publishListingCreated(listing: unknown) {
    this.server.emit('listing.created', {
      data: listing,
      meta: {
        event: 'listing.created',
        emittedAt: new Date().toISOString(),
      },
    });
  }

  publishListingCreatedForUser(userId: string, listing: unknown) {
    this.server.to(`user:${userId}`).emit('listing.created', {
      data: listing,
      meta: {
        event: 'listing.created',
        emittedAt: new Date().toISOString(),
        room: `user:${userId}`,
      },
    });
  }
}
