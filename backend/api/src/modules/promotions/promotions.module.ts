import { Module } from '@nestjs/common';

import { PromotionsController } from './controllers/promotions.controller';
import { CouponsService } from './services/coupons.service';
import { DiscountEligibilityService } from './services/discount-eligibility.service';
import { DiscountPoliciesService } from './services/discount-policies.service';
import { PromotionCampaignsService } from './services/promotion-campaigns.service';
import { PromotionRedemptionsService } from './services/promotion-redemptions.service';

@Module({
  controllers: [PromotionsController],
  providers: [
    DiscountPoliciesService,
    CouponsService,
    PromotionCampaignsService,
    DiscountEligibilityService,
    PromotionRedemptionsService,
  ],
  exports: [
    DiscountPoliciesService,
    CouponsService,
    PromotionCampaignsService,
    DiscountEligibilityService,
    PromotionRedemptionsService,
  ],
})
export class PromotionsModule {}
