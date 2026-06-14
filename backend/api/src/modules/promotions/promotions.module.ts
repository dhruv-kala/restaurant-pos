import { Module } from '@nestjs/common';

import { PromotionsController } from './controllers/promotions.controller';
import { CouponsService } from './services/coupons.service';
import { DiscountEligibilityService } from './services/discount-eligibility.service';
import { DiscountPoliciesService } from './services/discount-policies.service';
import { PromotionCampaignsService } from './services/promotion-campaigns.service';

@Module({
  controllers: [PromotionsController],
  providers: [
    DiscountPoliciesService,
    CouponsService,
    PromotionCampaignsService,
    DiscountEligibilityService,
  ],
  exports: [
    DiscountPoliciesService,
    CouponsService,
    PromotionCampaignsService,
    DiscountEligibilityService,
  ],
})
export class PromotionsModule {}
