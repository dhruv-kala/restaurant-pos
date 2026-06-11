import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiningTableStatus, Prisma, ReservationStatus } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateReservationDto } from '../dto/create-reservation.dto';
import type {
  ReservationListResponseDto,
  TableReservationResponseDto,
} from '../dto/table-response.dto';
import type { ReservationQueryDto } from '../dto/table-query.dto';
import type { UpdateReservationStatusDto } from '../dto/update-reservation-status.dto';
import type { UpdateReservationDto } from '../dto/update-reservation.dto';
import { requireTableRead, requireTableWrite, resolveTableScope } from './table-access.util';

const reservationSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  tableId: true,
  customerName: true,
  customerPhone: true,
  reservationDate: true,
  guestCount: true,
  specialInstructions: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TableReservationSelect;

type ReservationRecord = Prisma.TableReservationGetPayload<{
  select: typeof reservationSelect;
}>;

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateReservationDto,
    user: AuthenticatedUser,
  ): Promise<TableReservationResponseDto> {
    requireTableWrite(user);
    const scope = resolveTableScope(dto.tenantId, dto.outletId, user, true);
    if (dto.reservationDate <= new Date()) {
      throw new BadRequestException('Reservation date must be in the future');
    }
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const table = await this.requireReservationTable(tx, dto.tableId, scope, dto.guestCount);
      try {
        return await tx.tableReservation.create({
          data: {
            tenantId: table.tenantId,
            outletId: table.outletId,
            tableId: table.id,
            customerName: dto.customerName.trim(),
            customerPhone: dto.customerPhone,
            reservationDate: dto.reservationDate,
            guestCount: dto.guestCount,
            specialInstructions: dto.specialInstructions?.trim(),
          },
          select: reservationSelect,
        });
      } catch (error: unknown) {
        this.throwConflict(error);
      }
    });
  }

  async findAll(
    query: ReservationQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReservationListResponseDto> {
    requireTableRead(user);
    const scope = resolveTableScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const dayStart = query.reservationDate;
      const dayEnd =
        dayStart === undefined ? undefined : new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const where: Prisma.TableReservationWhereInput = {
        deletedAt: null,
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        ...(query.status === undefined ? {} : { status: query.status }),
        ...(dayStart === undefined ? {} : { reservationDate: { gte: dayStart, lt: dayEnd } }),
        ...(query.search?.trim()
          ? {
              OR: [
                {
                  customerName: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  customerPhone: {
                    contains: query.search.trim(),
                  },
                },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.tableReservation.findMany({
          where,
          select: reservationSelect,
          orderBy: { reservationDate: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.tableReservation.count({ where }),
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

  async findOne(id: string, user: AuthenticatedUser) {
    requireTableRead(user);
    return this.withReservation(id, user, (_tx, reservation) => Promise.resolve(reservation));
  }

  async update(id: string, dto: UpdateReservationDto, user: AuthenticatedUser) {
    requireTableWrite(user);
    return this.withReservation(id, user, async (tx, reservation) => {
      const tableId = dto.tableId ?? reservation.tableId;
      const guestCount = dto.guestCount ?? reservation.guestCount;
      await this.requireReservationTable(
        tx,
        tableId,
        {
          tenantId: reservation.tenantId,
          outletId: reservation.outletId,
        },
        guestCount,
      );
      try {
        return await tx.tableReservation.update({
          where: { id },
          data: {
            tableId: dto.tableId,
            customerName: dto.customerName?.trim(),
            customerPhone: dto.customerPhone,
            reservationDate: dto.reservationDate,
            guestCount: dto.guestCount,
            specialInstructions: dto.specialInstructions?.trim(),
            version: { increment: 1 },
          },
          select: reservationSelect,
        });
      } catch (error: unknown) {
        this.throwConflict(error);
      }
    });
  }

  async updateStatus(id: string, dto: UpdateReservationStatusDto, user: AuthenticatedUser) {
    requireTableWrite(user);
    return this.withReservation(id, user, async (tx, reservation) => {
      this.assertTransition(reservation.status, dto.status);
      const tableStatus = this.tableStatusForReservation(dto.status);
      if (tableStatus !== null) {
        const table = await tx.diningTable.findFirst({
          where: {
            id: reservation.tableId,
            tenantId: reservation.tenantId,
            outletId: reservation.outletId,
            deletedAt: null,
          },
          select: { status: true },
        });
        if (table === null) throw new NotFoundException('Dining table not found');
        if (
          dto.status === ReservationStatus.CONFIRMED &&
          table.status !== DiningTableStatus.AVAILABLE
        ) {
          throw new ConflictException('Only available tables can be reserved');
        }
        await tx.diningTable.update({
          where: { id: reservation.tableId },
          data: { status: tableStatus, version: { increment: 1 } },
        });
      }
      return tx.tableReservation.update({
        where: { id },
        data: { status: dto.status, version: { increment: 1 } },
        select: reservationSelect,
      });
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    requireTableWrite(user);
    await this.withReservation(id, user, async (tx, reservation) => {
      if (
        reservation.status === ReservationStatus.SEATED ||
        reservation.status === ReservationStatus.COMPLETED
      ) {
        throw new ConflictException('Seated or completed reservations cannot be deleted');
      }
      await tx.tableReservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (reservation.status === ReservationStatus.CONFIRMED) {
        await tx.diningTable.update({
          where: { id: reservation.tableId },
          data: {
            status: DiningTableStatus.AVAILABLE,
            version: { increment: 1 },
          },
        });
      }
    });
  }

  private async withReservation<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (tx: Prisma.TransactionClient, reservation: ReservationRecord) => Promise<T>,
  ): Promise<T> {
    const scope = resolveTableScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const reservation = await tx.tableReservation.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        select: reservationSelect,
      });
      if (reservation === null) {
        throw new NotFoundException('Reservation not found');
      }
      return operation(tx, reservation);
    });
  }

  private async requireReservationTable(
    tx: Prisma.TransactionClient,
    tableId: string,
    scope: { tenantId?: string; outletId?: string },
    guestCount: number,
  ) {
    const table = await tx.diningTable.findFirst({
      where: {
        id: tableId,
        isActive: true,
        deletedAt: null,
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
      },
      select: { id: true, tenantId: true, outletId: true, capacity: true },
    });
    if (table === null) throw new BadRequestException('Table is not accessible');
    if (guestCount > table.capacity) {
      throw new BadRequestException('Guest count exceeds table capacity');
    }
    return table;
  }

  private assertTransition(current: ReservationStatus, next: ReservationStatus): void {
    const allowed: Record<ReservationStatus, ReservationStatus[]> = {
      PENDING: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
      CONFIRMED: [ReservationStatus.SEATED, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
      SEATED: [ReservationStatus.COMPLETED],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Reservation cannot transition from ${current} to ${next}`);
    }
  }

  private tableStatusForReservation(status: ReservationStatus): DiningTableStatus | null {
    switch (status) {
      case ReservationStatus.CONFIRMED:
        return DiningTableStatus.RESERVED;
      case ReservationStatus.SEATED:
        return DiningTableStatus.OCCUPIED;
      case ReservationStatus.COMPLETED:
        return DiningTableStatus.CLEANING;
      case ReservationStatus.CANCELLED:
      case ReservationStatus.NO_SHOW:
        return DiningTableStatus.AVAILABLE;
      default:
        return null;
    }
  }

  private throwConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Table already has a reservation at this time');
    }
    throw error;
  }
}
