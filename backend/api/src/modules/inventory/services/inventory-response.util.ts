import { Prisma } from '@prisma/client';

export function decimal(value: Prisma.Decimal): number {
  return value.toNumber();
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
