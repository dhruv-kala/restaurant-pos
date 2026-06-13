import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommunicationProvidersService } from './communication-providers.service';

describe('CommunicationProvidersService', () => {
  const service = new CommunicationProvidersService(
    {} as PrismaService,
    {} as AuditService,
  );
  const json = service as unknown as {
    json(value: Record<string, unknown>): unknown;
  };

  it('rejects credentials embedded in provider metadata', () => {
    expect(() => json.json({ authToken: 'plaintext-token' })).toThrow(
      BadRequestException,
    );
    expect(() => json.json({ credentials: { password: 'plaintext' } })).toThrow(
      BadRequestException,
    );
  });

  it('allows environment-backed secret references', () => {
    expect(
      json.json({ webhookSecretReference: 'env:COMMUNICATION_WEBHOOK_SECRET' }),
    ).toEqual({
      webhookSecretReference: 'env:COMMUNICATION_WEBHOOK_SECRET',
    });
  });
});
