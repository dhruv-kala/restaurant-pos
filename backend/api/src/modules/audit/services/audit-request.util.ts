import type { Request } from 'express';

import type { AuditRequestMetadata } from '../models/audit-event.model';

export function auditRequestMetadata(request: Request): AuditRequestMetadata {
  const forwarded = request.headers['x-forwarded-for'];
  const correlation = request.headers['x-correlation-id'];
  return {
    correlationId: Array.isArray(correlation) ? correlation[0] : correlation,
    ipAddress:
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() ?? request.ip,
    userAgent: request.headers['user-agent'],
  };
}
