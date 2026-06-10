import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../../config/environment.validation';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy({
    get: jest.fn().mockReturnValue('test_access_secret'),
  } as unknown as ConfigService<EnvironmentVariables, true>);

  it('maps a valid access payload to the authenticated user context', () => {
    expect(
      strategy.validate({
        sub: 'user-id',
        email: 'admin@example.com',
        name: 'Admin User',
        tenantId: 'tenant-id',
        outletId: 'outlet-id',
        roles: ['TENANT_ADMIN'],
        type: 'access',
      }),
    ).toEqual({
      id: 'user-id',
      email: 'admin@example.com',
      name: 'Admin User',
      tenantId: 'tenant-id',
      outletId: 'outlet-id',
      roles: ['TENANT_ADMIN'],
    });
  });
});
