import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunicationChannel, Prisma } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CommunicationTemplateQueryDto,
  CreateCommunicationTemplateDto,
  PreviewCommunicationTemplateDto,
  UpdateCommunicationTemplateDto,
} from '../dto/communication-template.dto';
import {
  requireCommunicationTemplateManage,
  requireCommunicationTemplateView,
  resolveCommunicationTemplateTenant,
} from './communication-template-access.util';
import {
  CommunicationTemplateRenderer,
  type CommunicationTemplateVariableInput,
  type PreparedCommunicationTemplate,
} from './communication-template-renderer';

const versionInclude = {
  createdBy: { select: { id: true, displayName: true } },
} satisfies Prisma.CommunicationTemplateVersionInclude;

const templateInclude = {
  versions: {
    include: versionInclude,
    orderBy: { versionNumber: 'desc' as const },
    take: 1,
  },
  _count: { select: { versions: true, messages: true } },
} satisfies Prisma.CommunicationTemplateInclude;

type TemplateRecord = Prisma.CommunicationTemplateGetPayload<{
  include: typeof templateInclude;
}>;

@Injectable()
export class CommunicationTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly renderer: CommunicationTemplateRenderer,
  ) {}

  async create(
    dto: CreateCommunicationTemplateDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCommunicationTemplateManage(actor);
    const tenantId = resolveCommunicationTemplateTenant(actor, dto.tenantId);
    const prepared = this.prepare(
      dto.channel,
      dto.subjectTemplate,
      dto.bodyTemplate,
      dto.variables,
    );

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      try {
        const template = await tx.communicationTemplate.create({
          data: {
            tenantId,
            templateKey: dto.templateKey.trim().toLowerCase(),
            channel: dto.channel,
            name: this.requiredText(dto.name, 'Template name'),
            description: dto.description?.trim() || null,
            status: dto.status,
            versions: {
              create: {
                tenantId,
                versionNumber: 1,
                subjectTemplate: prepared.subjectTemplate,
                bodyTemplate: prepared.bodyTemplate,
                variableSchema: prepared.variables,
                createdByUserId: actor.id,
              },
            },
          },
          include: templateInclude,
        });
        await this.auditTemplateChange(tx, template, actor, request, 'created');
        await this.auditVersionCreated(tx, template, actor, request);
        return this.response(template);
      } catch (error) {
        if (this.isUniqueConflict(error)) {
          throw new ConflictException('Template key already exists for this channel');
        }
        throw error;
      }
    });
  }

  async list(query: CommunicationTemplateQueryDto, actor: AuthenticatedUser) {
    requireCommunicationTemplateView(actor);
    const tenantId = resolveCommunicationTemplateTenant(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const where: Prisma.CommunicationTemplateWhereInput = {
        tenantId,
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                { templateKey: { contains: query.search.trim(), mode: 'insensitive' } },
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
                { description: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [records, total] = await Promise.all([
        tx.communicationTemplate.findMany({
          where,
          include: templateInclude,
          orderBy: [{ name: 'asc' }, { templateKey: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.communicationTemplate.count({ where }),
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
    requireCommunicationTemplateView(actor);
    const tenantId = resolveCommunicationTemplateTenant(actor, requestedTenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      return this.response(await this.findTemplate(tx, tenantId, id));
    });
  }

  async update(
    id: string,
    dto: UpdateCommunicationTemplateDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCommunicationTemplateManage(actor);
    const tenantId = resolveCommunicationTemplateTenant(actor, dto.tenantId);
    if (!this.hasEditableFields(dto)) {
      throw new BadRequestException('At least one template field must be changed');
    }

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const existing = await this.findTemplate(tx, tenantId, id);
      if (existing.version !== dto.version) {
        throw new ConflictException('Template was updated by another request');
      }
      const latest = existing.versions[0];
      const prepared = this.prepare(
        existing.channel,
        dto.subjectTemplate === undefined ? latest.subjectTemplate : dto.subjectTemplate,
        dto.bodyTemplate ?? latest.bodyTemplate,
        dto.variables ?? this.variables(latest.variableSchema),
      );
      const nextVersion = existing.version + 1;
      const updated = await tx.communicationTemplate.updateMany({
        where: { id, tenantId, version: dto.version },
        data: {
          ...(dto.name !== undefined ? { name: this.requiredText(dto.name, 'Template name') } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          version: nextVersion,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Template was updated by another request');
      }
      await tx.communicationTemplateVersion.create({
        data: {
          tenantId,
          templateId: id,
          versionNumber: nextVersion,
          subjectTemplate: prepared.subjectTemplate,
          bodyTemplate: prepared.bodyTemplate,
          variableSchema: prepared.variables,
          createdByUserId: actor.id,
        },
      });
      const template = await this.findTemplate(tx, tenantId, id);
      await this.auditTemplateChange(tx, template, actor, request, 'updated');
      await this.auditVersionCreated(tx, template, actor, request);
      return this.response(template);
    });
  }

  async versions(id: string, requestedTenantId: string | undefined, actor: AuthenticatedUser) {
    requireCommunicationTemplateView(actor);
    const tenantId = resolveCommunicationTemplateTenant(actor, requestedTenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.findTemplate(tx, tenantId, id);
      return tx.communicationTemplateVersion.findMany({
        where: { tenantId, templateId: id },
        include: versionInclude,
        orderBy: { versionNumber: 'desc' },
      });
    });
  }

  async preview(id: string, dto: PreviewCommunicationTemplateDto, actor: AuthenticatedUser) {
    requireCommunicationTemplateView(actor);
    const tenantId = resolveCommunicationTemplateTenant(actor, dto.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const template = await this.findTemplate(tx, tenantId, id);
      const latest = template.versions[0];
      const prepared: PreparedCommunicationTemplate = {
        subjectTemplate: latest.subjectTemplate,
        bodyTemplate: latest.bodyTemplate,
        variables: this.variables(latest.variableSchema),
      };
      return {
        templateId: template.id,
        versionId: latest.id,
        versionNumber: latest.versionNumber,
        channel: template.channel,
        ...this.renderer.render(prepared, dto.values),
      };
    });
  }

  private prepare(
    channel: CommunicationChannel,
    subjectTemplate: string | null | undefined,
    bodyTemplate: string,
    variables: CommunicationTemplateVariableInput[],
  ) {
    const prepared = this.renderer.prepare(subjectTemplate, bodyTemplate, variables);
    if (channel === CommunicationChannel.EMAIL && !prepared.subjectTemplate) {
      throw new BadRequestException('Email templates require a subject');
    }
    return prepared;
  }

  private async findTemplate(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<TemplateRecord> {
    const template = await tx.communicationTemplate.findFirst({
      where: { id, tenantId },
      include: templateInclude,
    });
    if (!template) throw new NotFoundException('Communication template not found');
    if (!template.versions[0]) {
      throw new ConflictException('Communication template has no version');
    }
    return template;
  }

  private variables(value: Prisma.JsonValue) {
    if (!Array.isArray(value)) {
      throw new ConflictException('Communication template variable schema is invalid');
    }
    return value.map((item) => {
      if (
        item === null ||
        Array.isArray(item) ||
        typeof item !== 'object' ||
        typeof item.key !== 'string'
      ) {
        throw new ConflictException('Communication template variable schema is invalid');
      }
      return {
        key: item.key,
        description: typeof item.description === 'string' ? item.description : null,
        required: true as const,
      };
    });
  }

  private response(template: TemplateRecord) {
    const latestVersion = template.versions[0];
    return {
      id: template.id,
      tenantId: template.tenantId,
      templateKey: template.templateKey,
      channel: template.channel,
      name: template.name,
      description: template.description,
      status: template.status,
      version: template.version,
      latestVersion,
      versionCount: template._count.versions,
      messageCount: template._count.messages,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private async auditTemplateChange(
    tx: Prisma.TransactionClient,
    template: TemplateRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: 'created' | 'updated',
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: template.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: `communication.template.${action}`,
      targetType: 'CommunicationTemplate',
      targetId: template.id,
      metadata: {
        templateKey: template.templateKey,
        channel: template.channel,
        status: template.status,
        version: template.version,
      },
      ...request,
    });
  }

  private async auditVersionCreated(
    tx: Prisma.TransactionClient,
    template: TemplateRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<void> {
    const latest = template.versions[0];
    await this.audit.append(tx, {
      tenantId: template.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'communication.template.version.created',
      targetType: 'CommunicationTemplateVersion',
      targetId: latest.id,
      metadata: {
        templateId: template.id,
        versionNumber: latest.versionNumber,
        variableKeys: this.variables(latest.variableSchema).map((variable) => variable.key),
      },
      ...request,
    });
  }

  private requiredText(value: string, label: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${label} is required`);
    return normalized;
  }

  private hasEditableFields(dto: UpdateCommunicationTemplateDto): boolean {
    return [
      dto.name,
      dto.description,
      dto.status,
      dto.subjectTemplate,
      dto.bodyTemplate,
      dto.variables,
    ].some((value) => value !== undefined);
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
