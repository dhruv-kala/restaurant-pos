import { Module } from '@nestjs/common';

import { FiscalPolicyController } from './controllers/fiscal-policy.controller';
import { TaxProfilesController } from './controllers/tax-profiles.controller';
import { TaxRulesController } from './controllers/tax-rules.controller';
import { FiscalPolicyService } from './services/fiscal-policy.service';
import { TaxProfilesService } from './services/tax-profiles.service';
import { TaxRulesService } from './services/tax-rules.service';

@Module({
  controllers: [TaxProfilesController, TaxRulesController, FiscalPolicyController],
  providers: [TaxProfilesService, TaxRulesService, FiscalPolicyService],
  exports: [TaxProfilesService, TaxRulesService, FiscalPolicyService],
})
export class TaxModule {}
