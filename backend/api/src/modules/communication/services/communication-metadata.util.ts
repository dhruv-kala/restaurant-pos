import type { Prisma } from '@prisma/client';

const sensitiveKey = /(authorization|credential|password|secret|token|api.?key|signature|cookie)/i;

export function sanitizeCommunicationMetadata(value: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCommunicationMetadata(item as Prisma.InputJsonValue));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKey.test(key)
          ? '[REDACTED]'
          : sanitizeCommunicationMetadata(item as Prisma.InputJsonValue),
      ]),
    );
  }
  return value;
}
