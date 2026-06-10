import { Module } from '@nestjs/common';

import {
  OutletsController,
  TenantOutletsController,
} from './outlets.controller';
import { OutletsService } from './outlets.service';

@Module({
  controllers: [OutletsController, TenantOutletsController],
  providers: [OutletsService],
  exports: [OutletsService],
})
export class OutletsModule {}
