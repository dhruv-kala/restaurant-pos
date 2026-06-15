import type { Prisma } from '@prisma/client';

const sensitiveKey =
  /(authorization|credential|password|secret|token|api.?key|signature|cookie|session)/i;

export function redactOutboxPayload(value: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => redactOutboxPayload(item as Prisma.InputJsonValue));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? '[REDACTED]' : redactOutboxPayload(item as Prisma.InputJsonValue),
      ]),
    );
  }
  return value;
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
