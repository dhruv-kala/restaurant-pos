import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AssignShiftDto } from '../dto/assign-shift.dto';
import type { CreateShiftDto, UpdateShiftDto } from '../dto/create-shift.dto';
import type { EmployeeQueryDto } from '../dto/employee-query.dto';
import { EmployeeEvent } from '../enums/employee-events';
import {
  requireEmployeeManagement,
  requireEmployeeRead,
  resolveEmployeeScope,
} from './employee-access.util';
import { EmployeeEventsService } from './employee-events.service';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EmployeeEventsService,
  ) {}

  async create(dto: CreateShiftDto, user: AuthenticatedUser) {
    requireEmployeeManagement(user);
    const scope = resolveEmployeeScope(dto.tenantId, dto.outletId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const outlet = await tx.outlet.findFirst({
        where: { id: dto.outletId, deletedAt: null, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        select: { tenantId: true },
      });
      if (!outlet) throw new NotFoundException('Outlet not found');
      try {
        return await tx.shift.create({
          data: {
            tenantId: outlet.tenantId,
            outletId: dto.outletId,
            name: dto.name.trim(),
            startTime: this.time(dto.startTime),
            endTime: this.time(dto.endTime),
            breakMinutes: dto.breakMinutes,
            isNightShift: dto.isNightShift,
            isActive: dto.isActive,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Shift name already exists for this outlet');
        }
        throw error;
      }
    });
  }

  async list(query: EmployeeQueryDto, user: AuthenticatedUser) {
    requireEmployeeRead(user);
    const scope = resolveEmployeeScope(query.tenantId, query.outletId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      return tx.shift.findMany({
        where: {
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      });
    });
  }

  async update(id: string, dto: UpdateShiftDto, user: AuthenticatedUser) {
    requireEmployeeManagement(user);
    const shift = await this.findForWrite(id, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, shift.tenantId);
      return tx.shift.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          startTime: dto.startTime ? this.time(dto.startTime) : undefined,
          endTime: dto.endTime ? this.time(dto.endTime) : undefined,
          breakMinutes: dto.breakMinutes,
          isNightShift: dto.isNightShift,
          isActive: dto.isActive,
          version: { increment: 1 },
        },
      });
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    requireEmployeeManagement(user);
    const shift = await this.findForWrite(id, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, shift.tenantId);
      const assignments = await tx.employeeShiftAssignment.count({ where: { shiftId: id } });
      if (assignments) {
        return tx.shift.update({
          where: { id },
          data: { isActive: false, version: { increment: 1 } },
        });
      }
      return tx.shift.delete({ where: { id } });
    });
  }

  async assign(dto: AssignShiftDto, user: AuthenticatedUser) {
    requireEmployeeManagement(user);
    const scope = resolveEmployeeScope(undefined, undefined, user);
    const assignment = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const employee = await tx.employeeProfile.findFirst({
        where: {
          id: dto.employeeId,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      const shift = await tx.shift.findFirst({
        where: {
          id: dto.shiftId,
          tenantId: employee.tenantId,
          outletId: employee.outletId,
          isActive: true,
        },
      });
      if (!shift) throw new NotFoundException('Active shift not found');
      const from = new Date(dto.effectiveFrom);
      const to = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
      const overlap = await tx.employeeShiftAssignment.count({
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          effectiveFrom: { lte: to ?? new Date('9999-12-31') },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }],
        },
      });
      if (overlap) throw new ConflictException('Employee already has a shift in this date range');
      return tx.employeeShiftAssignment.create({
        data: {
          tenantId: employee.tenantId,
          outletId: employee.outletId,
          employeeId: employee.id,
          shiftId: shift.id,
          effectiveFrom: from,
          effectiveTo: to,
          assignedByUserId: user.id,
        },
        include: { shift: true, employee: true },
      });
    });
    this.events.publish({
      type: EmployeeEvent.shiftAssigned,
      tenantId: assignment.tenantId,
      outletId: assignment.outletId,
      referenceId: assignment.id,
    });
    return assignment;
  }

  private async findForWrite(id: string, user: AuthenticatedUser) {
    const scope = resolveEmployeeScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const shift = await tx.shift.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
      });
      if (!shift) throw new NotFoundException('Shift not found');
      return shift;
    });
  }

  private time(value: string) {
    return new Date(`1970-01-01T${value}:00.000Z`);
  }
}
