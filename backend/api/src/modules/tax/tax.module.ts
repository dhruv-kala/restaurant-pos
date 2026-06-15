import { Module } from '@nestjs/common';

import { FiscalPolicyController } from './controllers/fiscal-policy.controller';
import { TaxCalculationController } from './controllers/tax-calculation.controller';
import { TaxProfilesController } from './controllers/tax-profiles.controller';
import { TaxReportsController } from './controllers/tax-reports.controller';
import { TaxRulesController } from './controllers/tax-rules.controller';
import { FiscalPolicyService } from './services/fiscal-policy.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxProfilesService } from './services/tax-profiles.service';
import { TaxReportsService } from './services/tax-reports.service';
import { TaxRulesService } from './services/tax-rules.service';

@Module({
  controllers: [
    TaxProfilesController,
    TaxRulesController,
    FiscalPolicyController,
    TaxCalculationController,
    TaxReportsController,
  ],
  providers: [
    TaxProfilesService,
    TaxRulesService,
    FiscalPolicyService,
    TaxCalculationService,
    TaxReportsService,
  ],
  exports: [
    TaxProfilesService,
    TaxRulesService,
    FiscalPolicyService,
    TaxCalculationService,
    TaxReportsService,
  ],
})
export class TaxModule {}
