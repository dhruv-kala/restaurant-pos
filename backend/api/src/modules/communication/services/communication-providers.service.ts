import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CommunicationProviderQueryDto,
  CreateCommunicationProviderDto,
  UpdateCommunicationProviderDto,
} from '../dto/communication-provider.dto';
import {
  requireCommunicationProviderManage,
  requireCommunicationProviderView,
  resolveCommunicationProviderTenant,
} from './communication-provider-access.util';

@Injectable()
export class CommunicationProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: CommunicationProviderQueryDto, actor: AuthenticatedUser) {
    requireCommunicationProviderView(actor);
    const tenantId = resolveCommunicationProviderTenant(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const where: Prisma.CommunicationProviderWhereInput = {
        tenantId,
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                { providerKey: { contains: query.search.trim(), mode: 'insensitive' } },
                { displayName: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [records, total] = await Promise.all([
        tx.communicationProvider.findMany({
          where,
          orderBy: [{ channel: 'asc' }, { priority: 'asc' }, { displayName: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.communicationProvider.count({ where }),
      ]);
      return {
        data: records.map((record) => this.response(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, requestedTenantId: string | undefined, actor: AuthenticatedUser) {
    requireCommunicationProviderView(actor);
    const tenantId = resolveCommunicationProviderTenant(actor, requestedTenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      return this.response(await this.find(tx, tenantId, id));
    });
  }

  async create(
    dto: CreateCommunicationProviderDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCommunicationProviderManage(actor);
    const tenantId = resolveCommunicationProviderTenant(actor, dto.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      try {
        const provider = await tx.communicationProvider.create({
          data: {
            tenantId,
            channel: dto.channel,
            providerKey: dto.providerKey.trim().toLowerCase(),
            displayName: this.requiredText(dto.displayName),
            status: dto.status,
            priority: dto.priority,
            secretReference: dto.secretReference?.trim() || null,
            configMetadata: this.json(dto.configMetadata),
            capabilities: this.json(dto.capabilities),
          },
        });
        await this.auditChange(tx, provider, actor, request, 'created');
        return this.response(provider);
      } catch (error) {
        if (this.uniqueConflict(error)) {
          throw new ConflictException('Provider key already exists for this channel');
        }
        throw error;
      }
    });
  }

  async update(
    id: string,
    dto: UpdateCommunicationProviderDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCommunicationProviderManage(actor);
    const tenantId = resolveCommunicationProviderTenant(actor, dto.tenantId);
    if (
      [
        dto.displayName,
        dto.status,
        dto.priority,
        dto.secretReference,
        dto.configMetadata,
        dto.capabilities,
      ].every((value) => value === undefined)
    ) {
      throw new BadRequestException('At least one provider field must be changed');
    }
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.find(tx, tenantId, id);
      const result = await tx.communicationProvider.updateMany({
        where: { id, tenantId, version: dto.version },
        data: {
          ...(dto.displayName !== undefined
            ? { displayName: this.requiredText(dto.displayName) }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.secretReference !== undefined
            ? { secretReference: dto.secretReference.trim() || null }
            : {}),
          ...(dto.configMetadata !== undefined
            ? { configMetadata: this.json(dto.configMetadata) }
            : {}),
          ...(dto.capabilities !== undefined
            ? { capabilities: this.json(dto.capabilities) }
            : {}),
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        throw new ConflictException('Provider was updated by another request');
      }
      const provider = await this.find(tx, tenantId, id);
      await this.auditChange(tx, provider, actor, request, 'updated');
      return this.response(provider);
    });
  }

  private async find(tx: Prisma.TransactionClient, tenantId: string, id: string) {
    const provider = await tx.communicationProvider.findFirst({ where: { id, tenantId } });
    if (!provider) throw new NotFoundException('Communication provider not found');
    return provider;
  }

  private response(provider: Prisma.CommunicationProviderGetPayload<object>) {
    return {
      id: provider.id,
      tenantId: provider.tenantId,
      channel: provider.channel,
      providerKey: provider.providerKey,
      displayName: provider.displayName,
      status: provider.status,
      priority: provider.priority,
      secretReference: provider.secretReference,
      configMetadata: provider.configMetadata,
      capabilities: provider.capabilities,
      version: provider.version,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  private async auditChange(
    tx: Prisma.TransactionClient,
    provider: Prisma.CommunicationProviderGetPayload<object>,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: 'created' | 'updated',
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: provider.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: `communication.provider.${action}`,
      targetType: 'CommunicationProvider',
      targetId: provider.id,
      metadata: {
        channel: provider.channel,
        providerKey: provider.providerKey,
        status: provider.status,
        priority: provider.priority,
        version: provider.version,
        hasSecretReference: provider.secretReference !== null,
      },
      ...request,
    });
  }

  private json(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
    this.rejectEmbeddedSecrets(value);
    return value as Prisma.InputJsonValue | undefined;
  }

  private rejectEmbeddedSecrets(value: unknown, key?: string, depth = 0): void {
    if (depth > 8) {
      throw new BadRequestException('Provider metadata is too deeply nested');
    }
    if (key && /(password|token|secret|private.?key|credential)/i.test(key)) {
      const isReference =
        /reference$/i.test(key) &&
        typeof value === 'string' &&
        /^env:[A-Z][A-Z0-9_]*$/.test(value);
      if (!isReference) {
        throw new BadRequestException(
          'Provider credentials must use environment references',
        );
      }
    }
    if (Array.isArray(value)) {
      for (const item of value) this.rejectEmbeddedSecrets(item, undefined, depth + 1);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [childKey, childValue] of Object.entries(value)) {
        this.rejectEmbeddedSecrets(childValue, childKey, depth + 1);
      }
    }
  }

  private requiredText(value: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException('Provider display name is required');
    return normalized;
  }

  private uniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
