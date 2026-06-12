import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AttendanceDto } from '../dto/attendance.dto';
import type { EmployeeQueryDto } from '../dto/employee-query.dto';
import { EmployeeEvent } from '../enums/employee-events';
import {
  isEmployeeSelfOnly,
  requireEmployeeRead,
  resolveEmployeeScope,
} from './employee-access.util';
import { EmployeeEventsService } from './employee-events.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EmployeeEventsService,
  ) {}

  async checkIn(dto: AttendanceDto, user: AuthenticatedUser) {
    requireEmployeeRead(user);
    const context = await this.employeeForAction(dto.employeeId, user);
    const now = new Date();
    const businessDate = this.businessDate(now);
    const record = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, context.tenantId);
      const assigned = await tx.employeeShiftAssignment.count({
        where: {
          tenantId: context.tenantId,
          employeeId: context.id,
          effectiveFrom: { lte: businessDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: businessDate } }],
        },
      });
      if (!assigned) throw new ConflictException('Employee has no active shift assignment');
      try {
        return await tx.attendance.create({
          data: {
            tenantId: context.tenantId,
            outletId: context.outletId,
            employeeId: context.id,
            attendanceDate: businessDate,
            businessDate,
            checkInTime: now,
            status: dto.status,
            remarks: dto.remarks?.trim(),
            deviceId: dto.deviceId,
            locationCaptured: dto.locationCaptured as Prisma.InputJsonValue | undefined,
            recordedByUserId: user.id,
          },
          include: { employee: true },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Employee is already checked in for this day');
        }
        throw error;
      }
    });
    this.events.publish({
      type: EmployeeEvent.attendanceCheckedIn,
      tenantId: record.tenantId,
      outletId: record.outletId,
      referenceId: record.id,
    });
    return record;
  }

  async checkOut(dto: AttendanceDto, user: AuthenticatedUser) {
    requireEmployeeRead(user);
    const employee = await this.employeeForAction(dto.employeeId, user);
    const now = new Date();
    const businessDate = this.businessDate(now);
    const record = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, employee.tenantId);
      const attendance = await tx.attendance.findUnique({
        where: {
          tenantId_employeeId_attendanceDate: {
            tenantId: employee.tenantId,
            employeeId: employee.id,
            attendanceDate: businessDate,
          },
        },
      });
      if (!attendance?.checkInTime) throw new ConflictException('Check-in is required first');
      if (attendance.checkOutTime) throw new ConflictException('Employee is already checked out');
      const workedMinutes = Math.max(
        0,
        Math.floor((now.getTime() - attendance.checkInTime.getTime()) / 60000),
      );
      return tx.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: now,
          workedMinutes,
          remarks: dto.remarks?.trim() ?? attendance.remarks,
          deviceId: dto.deviceId ?? attendance.deviceId,
          locationCaptured:
            (dto.locationCaptured as Prisma.InputJsonValue | undefined) ??
            attendance.locationCaptured ??
            undefined,
          recordedByUserId: user.id,
        },
        include: { employee: true },
      });
    });
    this.events.publish({
      type: EmployeeEvent.attendanceCheckedOut,
      tenantId: record.tenantId,
      outletId: record.outletId,
      referenceId: record.id,
    });
    return record;
  }

  async list(query: EmployeeQueryDto, user: AuthenticatedUser, employeeId?: string) {
    requireEmployeeRead(user);
    const scope = resolveEmployeeScope(query.tenantId, query.outletId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.AttendanceWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        ...(employeeId ? { employeeId } : {}),
        ...(isEmployeeSelfOnly(user) ? { employee: { userId: user.id } } : {}),
        ...(query.businessDate ? { businessDate: new Date(query.businessDate) } : {}),
        ...(query.fromDate || query.toDate
          ? {
              businessDate: {
                ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
                ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
              },
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.attendance.findMany({
          where,
          include: { employee: true },
          orderBy: [{ businessDate: 'desc' }, { checkInTime: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.attendance.count({ where }),
      ]);
      return {
        data,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  private async employeeForAction(id: string, user: AuthenticatedUser) {
    const scope = resolveEmployeeScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const employee = await tx.employeeProfile.findFirst({
        where: {
          id,
          status: { not: 'TERMINATED' },
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
          ...(isEmployeeSelfOnly(user) ? { userId: user.id } : {}),
        },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      return employee;
    });
  }

  private businessDate(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
}
