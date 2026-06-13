import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { TenantEntitlementsService } from '../services/tenant-entitlements.service';
import { EntitlementGuard } from './entitlement.guard';

const actor: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'manager@example.com',
  name: 'Manager',
  tenantId: '01975c30-0000-7000-8000-000000000100',
  outletId: null,
  roles: ['MANAGER'],
};

function context(): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: actor }),
    }),
  } as unknown as ExecutionContext;
}

describe('EntitlementGuard', () => {
  it('allows routes that do not declare an entitlement', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const requireForActor = jest.fn();
    const guard = new EntitlementGuard(reflector, {
      requireForActor,
    } as unknown as TenantEntitlementsService);

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(requireForActor).not.toHaveBeenCalled();
  });

  it('delegates declared feature enforcement to the evaluator', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('inventory'),
    } as unknown as Reflector;
    const requireForActor = jest.fn().mockResolvedValue({ enabled: true });
    const guard = new EntitlementGuard(reflector, {
      requireForActor,
    } as unknown as TenantEntitlementsService);

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(requireForActor).toHaveBeenCalledWith(actor, 'inventory');
  });
});
