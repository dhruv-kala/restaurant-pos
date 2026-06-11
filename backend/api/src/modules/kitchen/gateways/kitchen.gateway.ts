import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import type { EnvironmentVariables } from '../../../config/environment.validation';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AccessTokenPayload } from '../../auth/types/jwt-payload.type';
import type { KitchenRealtimeEvent } from '../enums/kitchen-events';

type KitchenSocket = Socket;

@WebSocketGateway({
  namespace: '/kitchen',
  cors: { origin: true, credentials: true },
})
export class KitchenGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(KitchenGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: KitchenSocket): Promise<void> {
    try {
      const token = this.token(client);
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      if (payload.type !== 'access' || !payload.sub || !payload.roles) {
        throw new Error('Invalid access token');
      }
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        tenantId: payload.tenantId,
        outletId: payload.outletId,
        roles: payload.roles,
      };
      (client.data as { user?: AuthenticatedUser }).user = user;
      if (user.tenantId !== null && user.roles.includes('TENANT_ADMIN')) {
        await client.join(this.tenantRoom(user.tenantId));
      }
      if (user.outletId !== null) await client.join(this.outletRoom(user.outletId));
    } catch {
      this.logger.warn(`Rejected kitchen socket ${client.id}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('subscribeKitchenQueue')
  async subscribeKitchenQueue(
    @ConnectedSocket() client: KitchenSocket,
    @MessageBody()
    payload: { tenantId?: string; outletId?: string; stationId?: string },
  ): Promise<{ subscribed: boolean }> {
    const user = this.user(client);
    if (user === undefined) return { subscribed: false };
    if (user.roles.includes('SUPER_ADMIN')) {
      const targetAllowed = await this.platformTargetAllowed(payload, user);
      if (!targetAllowed) return { subscribed: false };
      if (payload.tenantId !== undefined) {
        await client.join(this.tenantRoom(payload.tenantId));
      }
      if (payload.outletId !== undefined) {
        await client.join(this.outletRoom(payload.outletId));
      }
    }
    if (payload.stationId === undefined) return { subscribed: true };
    const allowed = await this.stationAllowed(payload.stationId, user);
    if (!allowed) return { subscribed: false };
    await client.join(this.stationRoom(payload.stationId));
    return { subscribed: true };
  }

  @SubscribeMessage('subscribeOrderUpdates')
  subscribeOrderUpdates(@ConnectedSocket() client: KitchenSocket): { subscribed: boolean } {
    return { subscribed: this.user(client) !== undefined };
  }

  publish(event: KitchenRealtimeEvent): void {
    const rooms = [
      this.tenantRoom(event.tenantId),
      this.outletRoom(event.outletId),
      ...(event.stationId === undefined ? [] : [this.stationRoom(event.stationId)]),
    ];
    this.server.to(rooms).emit(event.type, event);
  }

  private async stationAllowed(stationId: string, user: AuthenticatedUser): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, user.tenantId ?? undefined);
      return (
        (await tx.kitchenStation.count({
          where: {
            id: stationId,
            deletedAt: null,
            ...(user.tenantId === null ? {} : { tenantId: user.tenantId }),
            ...(user.outletId === null ? {} : { outletId: user.outletId }),
          },
        })) === 1
      );
    });
  }

  private async platformTargetAllowed(payload: {
    tenantId?: string;
    outletId?: string;
  }, user: AuthenticatedUser): Promise<boolean> {
    if (payload.tenantId === undefined && payload.outletId === undefined) return false;

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, payload.tenantId);
      const outlet =
        payload.outletId === undefined
          ? null
          : await tx.outlet.findFirst({
              where: {
                id: payload.outletId,
                deletedAt: null,
                ...(payload.tenantId === undefined ? {} : { tenantId: payload.tenantId }),
              },
              select: { tenantId: true },
            });
      if (payload.outletId !== undefined && outlet === null) return false;
      if (payload.tenantId === undefined) return true;
      if (outlet !== null) return outlet.tenantId === payload.tenantId;
      return (
        (await tx.tenant.count({
          where: { id: payload.tenantId, deletedAt: null },
        })) === 1
      );
    });
  }

  private token(client: Socket): string {
    const auth = client.handshake.auth as Record<string, unknown>;
    const authToken = auth.token;
    if (typeof authToken === 'string' && authToken.length > 0) return authToken;
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    throw new Error('Missing access token');
  }

  private tenantRoom(id: string): string {
    return `tenant:${id}`;
  }

  private outletRoom(id: string): string {
    return `outlet:${id}`;
  }

  private stationRoom(id: string): string {
    return `station:${id}`;
  }

  private user(client: KitchenSocket): AuthenticatedUser | undefined {
    return (client.data as { user?: AuthenticatedUser }).user;
  }
}
