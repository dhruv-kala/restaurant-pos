import { Module } from '@nestjs/common';

import { BusinessDayController } from './controllers/business-day.controller';
import { CashDrawersController } from './controllers/cash-drawers.controller';
import { ShiftSessionsController } from './controllers/shift-sessions.controller';
import { BusinessDayService } from './services/business-day.service';
import { CashDrawersService } from './services/cash-drawers.service';
import { ShiftSessionsService } from './services/shift-sessions.service';

@Module({
  controllers: [BusinessDayController, ShiftSessionsController, CashDrawersController],
  providers: [BusinessDayService, ShiftSessionsService, CashDrawersService],
  exports: [BusinessDayService, ShiftSessionsService, CashDrawersService],
})
export class BusinessDayModule {}
