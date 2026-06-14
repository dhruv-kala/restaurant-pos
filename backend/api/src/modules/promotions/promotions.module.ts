import { Module } from '@nestjs/common';

import { PromotionsController } from './controllers/promotions.controller';
import { DiscountPoliciesService } from './services/discount-policies.service';

@Module({
  controllers: [PromotionsController],
  providers: [DiscountPoliciesService],
  exports: [DiscountPoliciesService],
})
export class PromotionsModule {}
