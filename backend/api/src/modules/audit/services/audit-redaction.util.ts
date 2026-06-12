const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'authorization',
  'cookie',
  'cardnumber',
  'cvv',
  'pin',
];

export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED : sanitizeAuditValue(item),
    ]),
  );
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replaceAll(/[^a-zA-Z]/g, '').toLowerCase();
  return SENSITIVE_KEYS.some((candidate) => normalized.includes(candidate));
}
