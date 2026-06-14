import { Module } from '@nestjs/common';

import { PromotionsController } from './controllers/promotions.controller';
import { CouponsService } from './services/coupons.service';
import { DiscountPoliciesService } from './services/discount-policies.service';
import { PromotionCampaignsService } from './services/promotion-campaigns.service';

@Module({
  controllers: [PromotionsController],
  providers: [DiscountPoliciesService, CouponsService, PromotionCampaignsService],
  exports: [DiscountPoliciesService, CouponsService, PromotionCampaignsService],
})
export class PromotionsModule {}
