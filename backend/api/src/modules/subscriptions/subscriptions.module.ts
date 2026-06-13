import { Module } from '@nestjs/common';

import { SubscriptionPlansController } from './controllers/subscription-plans.controller';
import { TenantEntitlementsController } from './controllers/tenant-entitlements.controller';
import { TenantSubscriptionsController } from './controllers/tenant-subscriptions.controller';
import { EntitlementGuard } from './guards/entitlement.guard';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { TenantEntitlementsService } from './services/tenant-entitlements.service';
import { TenantSubscriptionsService } from './services/tenant-subscriptions.service';

@Module({
  controllers: [
    SubscriptionPlansController,
    TenantSubscriptionsController,
    TenantEntitlementsController,
  ],
  providers: [
    SubscriptionPlansService,
    TenantSubscriptionsService,
    TenantEntitlementsService,
    EntitlementGuard,
  ],
  exports: [
    SubscriptionPlansService,
    TenantSubscriptionsService,
    TenantEntitlementsService,
    EntitlementGuard,
  ],
})
export class SubscriptionsModule {}
