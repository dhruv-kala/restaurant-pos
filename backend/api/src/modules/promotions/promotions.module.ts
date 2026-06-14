import { Module } from '@nestjs/common';

import { PromotionsController } from './controllers/promotions.controller';
import { CouponsService } from './services/coupons.service';
import { DiscountPoliciesService } from './services/discount-policies.service';

@Module({
  controllers: [PromotionsController],
  providers: [DiscountPoliciesService, CouponsService],
  exports: [DiscountPoliciesService, CouponsService],
})
export class PromotionsModule {}
