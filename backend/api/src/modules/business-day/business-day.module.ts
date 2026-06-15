import { Module } from '@nestjs/common';

import { BusinessDayController } from './controllers/business-day.controller';
import { BusinessDayService } from './services/business-day.service';

@Module({
  controllers: [BusinessDayController],
  providers: [BusinessDayService],
  exports: [BusinessDayService],
})
export class BusinessDayModule {}
