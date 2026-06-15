import { Module } from '@nestjs/common';

import { BusinessDayController } from './controllers/business-day.controller';
import { ShiftSessionsController } from './controllers/shift-sessions.controller';
import { BusinessDayService } from './services/business-day.service';
import { ShiftSessionsService } from './services/shift-sessions.service';

@Module({
  controllers: [BusinessDayController, ShiftSessionsController],
  providers: [BusinessDayService, ShiftSessionsService],
  exports: [BusinessDayService, ShiftSessionsService],
})
export class BusinessDayModule {}
