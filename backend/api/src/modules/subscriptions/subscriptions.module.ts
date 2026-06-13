import { Module } from '@nestjs/common';

import { SubscriptionPlansController } from './controllers/subscription-plans.controller';
import { TenantEntitlementsController } from './controllers/tenant-entitlements.controller';
import { TenantSubscriptionsController } from './controllers/tenant-subscriptions.controller';
import { UsageLimitsController } from './controllers/usage-limits.controller';
import { EntitlementGuard } from './guards/entitlement.guard';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { TenantEntitlementsService } from './services/tenant-entitlements.service';
import { TenantSubscriptionsService } from './services/tenant-subscriptions.service';
import { UsageLimitsService } from './services/usage-limits.service';

@Module({
  controllers: [
    SubscriptionPlansController,
    TenantSubscriptionsController,
    TenantEntitlementsController,
    UsageLimitsController,
  ],
  providers: [
    SubscriptionPlansService,
    TenantSubscriptionsService,
    TenantEntitlementsService,
    UsageLimitsService,
    EntitlementGuard,
  ],
  exports: [
    SubscriptionPlansService,
    TenantSubscriptionsService,
    TenantEntitlementsService,
    UsageLimitsService,
    EntitlementGuard,
  ],
})
export class SubscriptionsModule {}
