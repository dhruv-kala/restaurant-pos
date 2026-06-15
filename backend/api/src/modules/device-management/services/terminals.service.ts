import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  DeviceAssignmentStatus,
  DeviceStatus,
  OutletStatus,
  Prisma,
  TerminalStatus,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  AssignDeviceToTerminalDto,
  CreateTerminalDto,
  DeviceAssignmentQueryDto,
  EndDeviceAssignmentDto,
  TerminalQueryDto,
  TenantDeviceQueryDto,
  UpdateTerminalDto,
} from '../dto/device.dto';
import {
  assertOutletAccess,
  requireTerminalManage,
  resolveDeviceReadScope,
  resolveDeviceWriteScope,
} from './device-access.util';

const terminalSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  terminalCode: true,
  name: true,
  terminalType: true,
  status: true,
  description: true,
  createdByUserId: true,
  updatedByUserId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.TerminalSelect;

const assignmentSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  terminalId: true,
  deviceId: true,
  status: true,
  assignedByUserId: true,
  endedByUserId: true,
  assignedAt: true,
  endedAt: true,
  endReason: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeviceAssignmentSelect;

const deviceForAssignmentSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  deviceIdentifier: true,
  deviceType: true,
  status: true,
} satisfies Prisma.DeviceSelect;

type TerminalRecord = Prisma.TerminalGetPayload<{ select: typeof terminalSelect }>;
type AssignmentRecord = Prisma.DeviceAssignmentGetPayload<{ select: typeof assignmentSelect }>;
type DeviceForAssignment = Prisma.DeviceGetPayload<{ select: typeof deviceForAssignmentSelect }>;

@Injectable()
export class TerminalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTerminalDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireTerminalManage(actor);
    const scope = resolveDeviceWriteScope(actor, dto.tenantId);
    const outletId = this.requiredText(dto.outletId, 'outletId');
    assertOutletAccess(actor, outletId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.assertOutletExists(tx, scope.tenantId, outletId);
      const terminalCode = this.requiredText(dto.terminalCode, 'terminalCode');
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${scope.tenantId}:terminal:${outletId}:${terminalCode.toLowerCase()}`}))`;
      const existing = await tx.terminal.findFirst({
        where: {
          tenantId: scope.tenantId,
          outletId,
          terminalCode,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Terminal code already exists for this outlet');
      }
      const terminal = await tx.terminal.create({
        data: {
          tenantId: scope.tenantId,
          outletId,
          terminalCode,
          name: this.requiredText(dto.name, 'name'),
          terminalType: dto.terminalType,
          description: this.optionalText(dto.description),
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        select: terminalSelect,
      });
      await this.auditTerminal(tx, terminal, actor, request, 'terminal.created');
      return this.toTerminalResponse(terminal);
    });
  }

  async list(query: TerminalQueryDto, actor: AuthenticatedUser) {
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    const outletId = this.constrainOutlet(actor, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.TerminalWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(outletId ? { outletId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.terminalType ? { terminalType: query.terminalType } : {}),
        deletedAt: null,
        ...(query.search?.trim()
          ? {
              OR: [
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
                { terminalCode: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const skip = (query.page - 1) * query.limit;
      const [records, total] = await Promise.all([
        tx.terminal.findMany({
          where,
          select: terminalSelect,
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: query.limit,
        }),
        tx.terminal.count({ where }),
      ]);
      return {
        data: records.map((terminal) => this.toTerminalResponse(terminal)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: TenantDeviceQueryDto, actor: AuthenticatedUser) {
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const terminal = await tx.terminal.findFirst({
        where: { id, deletedAt: null, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        select: terminalSelect,
      });
      if (!terminal) throw new NotFoundException('Terminal not found');
      assertOutletAccess(actor, terminal.outletId);
      return this.toTerminalResponse(terminal);
    });
  }

  async update(
    id: string,
    dto: UpdateTerminalDto,
    query: TenantDeviceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTerminalManage(actor);
    const scope = resolveDeviceWriteScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findTerminal(tx, scope.tenantId, id);
      assertOutletAccess(actor, existing.outletId);
      if (existing.version !== dto.version) {
        throw new ConflictException('Terminal version conflict');
      }
      if (!dto.name && dto.status === undefined && dto.description === undefined) {
        return this.toTerminalResponse(existing);
      }
      const updated = await tx.terminal.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id } },
        data: {
          ...(dto.name ? { name: this.requiredText(dto.name, 'name') } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.description !== undefined
            ? { description: this.optionalText(dto.description) }
            : {}),
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
        select: terminalSelect,
      });
      await this.auditTerminal(tx, updated, actor, request, 'terminal.updated', {
        previousStatus: existing.status,
        newStatus: updated.status,
      });
      return this.toTerminalResponse(updated);
    });
  }

  async assignDevice(
    terminalId: string,
    dto: AssignDeviceToTerminalDto,
    query: TenantDeviceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTerminalManage(actor);
    const scope = resolveDeviceWriteScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const terminal = await this.findTerminal(tx, scope.tenantId, terminalId);
      assertOutletAccess(actor, terminal.outletId);
      if (terminal.version !== dto.terminalVersion) {
        throw new ConflictException('Terminal version conflict');
      }
      if (terminal.status !== TerminalStatus.ACTIVE) {
        throw new ConflictException('Only active terminals can receive device assignments');
      }
      const device = await this.findDevice(tx, scope.tenantId, dto.deviceId);
      assertOutletAccess(actor, device.outletId);
      if (device.status !== DeviceStatus.ACTIVE) {
        throw new ConflictException('Only active devices can be assigned to terminals');
      }
      if (device.outletId !== terminal.outletId) {
        throw new BadRequestException('Device and terminal must belong to the same outlet');
      }
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${scope.tenantId}:terminal-assignment:${terminal.id}`}))`;
      const activeAssignment = await tx.deviceAssignment.findFirst({
        where: {
          tenantId: scope.tenantId,
          status: DeviceAssignmentStatus.ACTIVE,
          OR: [{ terminalId: terminal.id }, { deviceId: device.id }],
        },
        select: { id: true, terminalId: true, deviceId: true },
      });
      if (activeAssignment) {
        throw new ConflictException('Terminal or device already has an active assignment');
      }
      const assignment = await tx.deviceAssignment.create({
        data: {
          tenantId: scope.tenantId,
          outletId: terminal.outletId,
          terminalId: terminal.id,
          deviceId: device.id,
          assignedByUserId: actor.id,
        },
        select: assignmentSelect,
      });
      await this.auditAssignment(tx, assignment, actor, request, 'terminal.device_assigned', {
        terminalCode: terminal.terminalCode,
        deviceIdentifier: device.deviceIdentifier,
      });
      return this.toAssignmentResponse(assignment);
    });
  }

  async listAssignments(query: DeviceAssignmentQueryDto, actor: AuthenticatedUser) {
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    const outletId = this.constrainOutlet(actor, undefined);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.DeviceAssignmentWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(outletId ? { outletId } : {}),
        ...(query.terminalId ? { terminalId: query.terminalId } : {}),
        ...(query.deviceId ? { deviceId: query.deviceId } : {}),
        ...(query.status ? { status: query.status } : {}),
      };
      const skip = (query.page - 1) * query.limit;
      const [records, total] = await Promise.all([
        tx.deviceAssignment.findMany({
          where,
          select: assignmentSelect,
          orderBy: [{ assignedAt: 'desc' }],
          skip,
          take: query.limit,
        }),
        tx.deviceAssignment.count({ where }),
      ]);
      return {
        data: records.map((assignment) => this.toAssignmentResponse(assignment)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async listAssignmentsForTerminal(
    terminalId: string,
    query: DeviceAssignmentQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.listAssignments({ ...query, terminalId }, actor);
  }

  async endAssignment(
    id: string,
    dto: EndDeviceAssignmentDto,
    query: TenantDeviceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTerminalManage(actor);
    const scope = resolveDeviceWriteScope(actor, query.tenantId);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const assignment = await this.findAssignment(tx, scope.tenantId, id);
      assertOutletAccess(actor, assignment.outletId);
      if (assignment.version !== dto.version) {
        throw new ConflictException('Device assignment version conflict');
      }
      if (assignment.status === DeviceAssignmentStatus.ENDED) {
        return this.toAssignmentResponse(assignment);
      }
      const ended = await tx.deviceAssignment.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id } },
        data: {
          status: DeviceAssignmentStatus.ENDED,
          endedAt: now,
          endedByUserId: actor.id,
          endReason: this.optionalText(dto.reason),
          version: { increment: 1 },
        },
        select: assignmentSelect,
      });
      await this.auditAssignment(tx, ended, actor, request, 'terminal.device_assignment_ended', {
        previousStatus: assignment.status,
      });
      return this.toAssignmentResponse(ended);
    });
  }

  private async assertOutletExists(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
  ): Promise<void> {
    const outlet = await tx.outlet.findFirst({
      where: { tenantId, id: outletId, deletedAt: null, status: { not: OutletStatus.CLOSED } },
      select: { id: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
  }

  private async findTerminal(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<TerminalRecord> {
    const terminal = await tx.terminal.findFirst({
      where: { tenantId, id, deletedAt: null },
      select: terminalSelect,
    });
    if (!terminal) throw new NotFoundException('Terminal not found');
    return terminal;
  }

  private async findDevice(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<DeviceForAssignment> {
    const device = await tx.device.findFirst({
      where: { tenantId, id },
      select: deviceForAssignmentSelect,
    });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  private async findAssignment(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<AssignmentRecord> {
    const assignment = await tx.deviceAssignment.findFirst({
      where: { tenantId, id },
      select: assignmentSelect,
    });
    if (!assignment) throw new NotFoundException('Device assignment not found');
    return assignment;
  }

  private constrainOutlet(
    actor: AuthenticatedUser,
    requestedOutletId?: string,
  ): string | undefined {
    if (actor.roles.includes('SUPER_ADMIN') || actor.roles.includes('TENANT_ADMIN')) {
      return requestedOutletId;
    }
    if (!actor.outletId) {
      return requestedOutletId;
    }
    if (requestedOutletId && requestedOutletId !== actor.outletId) {
      throw new BadRequestException('Outlet access is forbidden');
    }
    return actor.outletId;
  }

  private async auditTerminal(
    tx: Prisma.TransactionClient,
    terminal: TerminalRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: terminal.tenantId,
      outletId: terminal.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'Terminal',
      targetId: terminal.id,
      result: AuditResult.SUCCESS,
      metadata: {
        terminalCode: terminal.terminalCode,
        terminalType: terminal.terminalType,
        status: terminal.status,
        version: terminal.version,
        ...extra,
      },
      ...request,
    });
  }

  private async auditAssignment(
    tx: Prisma.TransactionClient,
    assignment: AssignmentRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: assignment.tenantId,
      outletId: assignment.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'DeviceAssignment',
      targetId: assignment.id,
      result: AuditResult.SUCCESS,
      metadata: {
        terminalId: assignment.terminalId,
        deviceId: assignment.deviceId,
        status: assignment.status,
        version: assignment.version,
        ...extra,
      },
      ...request,
    });
  }

  private toTerminalResponse(terminal: TerminalRecord) {
    return {
      id: terminal.id,
      tenantId: terminal.tenantId,
      outletId: terminal.outletId,
      terminalCode: terminal.terminalCode,
      name: terminal.name,
      terminalType: terminal.terminalType,
      status: terminal.status,
      description: terminal.description,
      createdByUserId: terminal.createdByUserId,
      updatedByUserId: terminal.updatedByUserId,
      version: terminal.version,
      createdAt: terminal.createdAt.toISOString(),
      updatedAt: terminal.updatedAt.toISOString(),
      deletedAt: terminal.deletedAt?.toISOString() ?? null,
    };
  }

  private toAssignmentResponse(assignment: AssignmentRecord) {
    return {
      id: assignment.id,
      tenantId: assignment.tenantId,
      outletId: assignment.outletId,
      terminalId: assignment.terminalId,
      deviceId: assignment.deviceId,
      status: assignment.status,
      assignedByUserId: assignment.assignedByUserId,
      endedByUserId: assignment.endedByUserId,
      assignedAt: assignment.assignedAt.toISOString(),
      endedAt: assignment.endedAt?.toISOString() ?? null,
      endReason: assignment.endReason,
      version: assignment.version,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    };
  }

  private requiredText(value: string, field: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException(`${field} is required`);
    }
    return trimmed;
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
}
