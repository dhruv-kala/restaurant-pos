import { AuditResult, type Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService append', () => {
  it('serializes a scope, chains the previous hash, and redacts secrets', async () => {
    const created: Array<Record<string, unknown>> = [];
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      auditEvent: {
        findFirst: jest.fn().mockResolvedValue({ eventHash: 'a'.repeat(64) }),
        create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
          created.push(args.data);
          return Promise.resolve({ id: 'event-id', ...args.data });
        }),
      },
    } as unknown as Prisma.TransactionClient;
    const service = new AuditService({} as PrismaService);

    await service.append(transaction, {
      tenantId: '01975f6f-b03d-7ac2-893f-c7e858a42ff2',
      actorUserId: '01975f6f-b03d-7ac2-893f-c7e858a42ff1',
      actorRoles: ['TENANT_ADMIN'],
      action: 'users.password_reset.initialized',
      targetType: 'UserAccount',
      targetId: '01975f6f-b03d-7ac2-893f-c7e858a42ff3',
      result: AuditResult.SUCCESS,
      metadata: { password: 'never-store-this', safe: 'value' },
    });

    expect(transaction.$queryRaw).toHaveBeenCalled();
    expect(created[0]?.previousHash).toBe('a'.repeat(64));
    expect(typeof created[0]?.eventHash).toBe('string');
    expect(String(created[0]?.eventHash)).toMatch(/^[0-9a-f]{64}$/);
    expect(created[0]?.metadata).toEqual({
      password: '[REDACTED]',
      safe: 'value',
    });
  });
});
