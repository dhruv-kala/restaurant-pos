import { Module } from '@nestjs/common';

import { SubscriptionPlansController } from './controllers/subscription-plans.controller';
import { TenantSubscriptionsController } from './controllers/tenant-subscriptions.controller';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { TenantSubscriptionsService } from './services/tenant-subscriptions.service';

@Module({
  controllers: [SubscriptionPlansController, TenantSubscriptionsController],
  providers: [SubscriptionPlansService, TenantSubscriptionsService],
  exports: [SubscriptionPlansService, TenantSubscriptionsService],
})
export class SubscriptionsModule {}
