import type { AuditResult, Prisma } from '@prisma/client';

export interface AuditRequestMetadata {
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AppendAuditEvent {
  tenantId: string | null;
  outletId?: string | null;
  actorUserId?: string | null;
  effectiveUserId?: string | null;
  impersonatorUserId?: string | null;
  actorRoles?: string[];
  action: string;
  targetType: string;
  targetId?: string | null;
  result?: AuditResult;
  reason?: string | null;
  changes?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
