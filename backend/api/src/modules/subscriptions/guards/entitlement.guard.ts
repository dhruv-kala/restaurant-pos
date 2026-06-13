import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { REQUIRED_ENTITLEMENT_KEY } from '../decorators/requires-entitlement.decorator';
import { TenantEntitlementsService } from '../services/tenant-entitlements.service';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: TenantEntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(REQUIRED_ENTITLEMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    await this.entitlements.requireForActor(request.user, featureKey);
    return true;
  }
}
