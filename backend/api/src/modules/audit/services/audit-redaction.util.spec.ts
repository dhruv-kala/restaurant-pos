import { sanitizeAuditValue } from './audit-redaction.util';

describe('audit redaction', () => {
  it('redacts nested credentials and payment secrets', () => {
    expect(
      sanitizeAuditValue({
        email: 'admin@example.test',
        password: 'secret',
        nested: {
          refreshToken: 'token',
          cardNumber: '4111111111111111',
          safe: 'value',
        },
      }),
    ).toEqual({
      email: 'admin@example.test',
      password: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        cardNumber: '[REDACTED]',
        safe: 'value',
      },
    });
  });
});
