import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateEmployeeDto } from '../dto/create-employee.dto';
import type { EmployeeQueryDto } from '../dto/employee-query.dto';
import type { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeEvent } from '../enums/employee-events';
import {
  isEmployeeSelfOnly,
  requireEmployeeManagement,
  requireEmployeeRead,
  resolveEmployeeScope,
} from './employee-access.util';
import { EmployeeEventsService } from './employee-events.service';

const include = {
  outlet: { select: { id: true, name: true } },
  role: { select: { id: true, name: true, systemKey: true } },
  user: { select: { id: true, displayName: true, status: true } },
  reportingManager: { select: { id: true, firstName: true, lastName: true } },
  shiftAssignments: {
    include: { shift: true },
    orderBy: { effectiveFrom: 'desc' as const },
    take: 5,
  },
} satisfies Prisma.EmployeeProfileInclude;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EmployeeEventsService,
  ) {}

  async create(dto: CreateEmployeeDto, user: AuthenticatedUser) {
    requireEmployeeManagement(user);
    const scope = resolveEmployeeScope(dto.tenantId, dto.outletId, user);
    const employee = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const tenantId = await this.validateIdentity(
        tx,
        scope.tenantId,
        dto.outletId,
        dto.userId,
        dto.roleId,
      );
      await this.validateManager(tx, tenantId, dto.outletId, dto.reportingManagerId);
      try {
        return await tx.employeeProfile.create({
          data: {
            tenantId,
            outletId: dto.outletId,
            userId: dto.userId,
            roleId: dto.roleId,
            employeeCode: dto.employeeCode.trim(),
            firstName: dto.firstName.trim(),
            lastName: dto.lastName?.trim(),
            phone: dto.phone?.trim(),
            email: dto.email?.trim().toLowerCase(),
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            dateOfJoining: new Date(dto.dateOfJoining),
            designation: dto.designation.trim(),
            department: dto.department,
            employmentType: dto.employmentType,
            salary: dto.salary,
            reportingManagerId: dto.reportingManagerId,
            profileImageUrl: dto.profileImageUrl,
            preferredLanguage: dto.preferredLanguage,
            emergencyContactName: dto.emergencyContactName?.trim(),
            emergencyContactPhone: dto.emergencyContactPhone?.trim(),
            status: dto.status,
            createdByUserId: user.id,
            updatedByUserId: user.id,
          },
          include,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Employee code or user profile already exists');
        }
        throw error;
      }
    });
    this.events.publish({
      type: EmployeeEvent.employeeCreated,
      tenantId: employee.tenantId,
      outletId: employee.outletId,
      referenceId: employee.id,
    });
    return employee;
  }

  async list(query: EmployeeQueryDto, user: AuthenticatedUser) {
    requireEmployeeRead(user);
    const scope = resolveEmployeeScope(query.tenantId, query.outletId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.EmployeeProfileWhereInput = {
        deletedAt: null,
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        ...(isEmployeeSelfOnly(user) ? { userId: user.id } : {}),
        ...(query.search
          ? {
              OR: [
                { employeeCode: { contains: query.search, mode: 'insensitive' } },
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search } },
              ],
            }
          : {}),
        ...(query.designation
          ? { designation: { contains: query.designation, mode: 'insensitive' } }
          : {}),
        ...(query.department ? { department: query.department } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.shiftId
          ? { shiftAssignments: { some: { shiftId: query.shiftId } } }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.employeeProfile.findMany({
          where,
          include,
          orderBy: [{ firstName: 'asc' }, { employeeCode: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.employeeProfile.count({ where }),
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

  async detail(id: string, user: AuthenticatedUser) {
    requireEmployeeRead(user);
    const scope = resolveEmployeeScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const employee = await tx.employeeProfile.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
          ...(isEmployeeSelfOnly(user) ? { userId: user.id } : {}),
        },
        include,
      });
      if (!employee) throw new NotFoundException('Employee not found');
      return employee;
    });
  }

  async update(id: string, dto: UpdateEmployeeDto, user: AuthenticatedUser) {
    requireEmployeeManagement(user);
    const existing = await this.detailForWrite(id, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, existing.tenantId);
      const outletId = dto.outletId ?? existing.outletId;
      const roleId = dto.roleId ?? existing.roleId;
      await this.validateIdentity(tx, existing.tenantId, outletId, existing.userId, roleId);
      await this.validateManager(tx, existing.tenantId, outletId, dto.reportingManagerId);
      return tx.employeeProfile.update({
        where: { id },
        data: {
          ...dto,
          firstName: dto.firstName?.trim(),
          lastName: dto.lastName?.trim(),
          phone: dto.phone?.trim(),
          email: dto.email?.trim().toLowerCase(),
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
          designation: dto.designation?.trim(),
          emergencyContactName: dto.emergencyContactName?.trim(),
          emergencyContactPhone: dto.emergencyContactPhone?.trim(),
          updatedByUserId: user.id,
          version: { increment: 1 },
        },
        include,
      });
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    requireEmployeeManagement(user);
    const existing = await this.detailForWrite(id, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, existing.tenantId);
      return tx.employeeProfile.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          deletedAt: new Date(),
          updatedByUserId: user.id,
          version: { increment: 1 },
        },
        include,
      });
    });
  }

  async dashboard(query: EmployeeQueryDto, user: AuthenticatedUser) {
    requireEmployeeManagement(user);
    const scope = resolveEmployeeScope(query.tenantId, query.outletId, user);
    const today = this.businessDate();
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const base = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
      };
      const [totalEmployees, presentToday, absentToday, onLeave, activeShifts] =
        await Promise.all([
          tx.employeeProfile.count({ where: { ...base, deletedAt: null } }),
          tx.attendance.count({
            where: { ...base, businessDate: today, status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] } },
          }),
          tx.attendance.count({ where: { ...base, businessDate: today, status: 'ABSENT' } }),
          tx.employeeProfile.count({ where: { ...base, deletedAt: null, status: 'ON_LEAVE' } }),
          tx.shift.count({ where: { ...base, isActive: true } }),
        ]);
      return { totalEmployees, presentToday, absentToday, employeesOnLeave: onLeave, activeShifts };
    });
  }

  private async detailForWrite(id: string, user: AuthenticatedUser) {
    const scope = resolveEmployeeScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const employee = await tx.employeeProfile.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      return employee;
    });
  }

  private async validateIdentity(
    tx: Prisma.TransactionClient,
    tenantId: string | undefined,
    outletId: string,
    userId: string,
    roleId: string,
  ): Promise<string> {
    const outlet = await tx.outlet.findFirst({
      where: { id: outletId, deletedAt: null, ...(tenantId ? { tenantId } : {}) },
      select: { tenantId: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    const membership = await tx.tenantMembership.findFirst({
      where: {
        tenantId: outlet.tenantId,
        userId,
        status: 'ACTIVE',
        roleAssignments: { some: { roleId } },
        outletAssignments: { some: { outletId } },
      },
    });
    if (!membership) {
      throw new ConflictException(
        'User must have an active tenant membership, role, and outlet assignment',
      );
    }
    return outlet.tenantId;
  }

  private async validateManager(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    managerId?: string,
  ) {
    if (!managerId) return;
    const count = await tx.employeeProfile.count({
      where: { id: managerId, tenantId, outletId, deletedAt: null },
    });
    if (!count) throw new NotFoundException('Reporting manager not found');
  }

  private businessDate() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
