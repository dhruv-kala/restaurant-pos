import { Module } from '@nestjs/common';

import { TaxProfilesController } from './controllers/tax-profiles.controller';
import { TaxProfilesService } from './services/tax-profiles.service';

@Module({
  controllers: [TaxProfilesController],
  providers: [TaxProfilesService],
  exports: [TaxProfilesService],
})
export class TaxModule {}
