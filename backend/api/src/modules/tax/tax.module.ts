import { Module } from '@nestjs/common';

import { TaxProfilesController } from './controllers/tax-profiles.controller';
import { TaxRulesController } from './controllers/tax-rules.controller';
import { TaxProfilesService } from './services/tax-profiles.service';
import { TaxRulesService } from './services/tax-rules.service';

@Module({
  controllers: [TaxProfilesController, TaxRulesController],
  providers: [TaxProfilesService, TaxRulesService],
  exports: [TaxProfilesService, TaxRulesService],
})
export class TaxModule {}
