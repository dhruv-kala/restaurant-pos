import { Module } from '@nestjs/common';

import { SubscriptionPlansController } from './controllers/subscription-plans.controller';
import { SubscriptionPlansService } from './services/subscription-plans.service';

@Module({
  controllers: [SubscriptionPlansController],
  providers: [SubscriptionPlansService],
  exports: [SubscriptionPlansService],
})
export class SubscriptionsModule {}
