import { Module } from '@nestjs/common';

import { BusinessDayController } from './controllers/business-day.controller';
import { CashDrawersController } from './controllers/cash-drawers.controller';
import { ShiftReconciliationsController } from './controllers/shift-reconciliations.controller';
import { ShiftSessionsController } from './controllers/shift-sessions.controller';
import { BusinessDayService } from './services/business-day.service';
import { CashDrawersService } from './services/cash-drawers.service';
import { ShiftReconciliationsService } from './services/shift-reconciliations.service';
import { ShiftSessionsService } from './services/shift-sessions.service';

@Module({
  controllers: [
    BusinessDayController,
    ShiftSessionsController,
    CashDrawersController,
    ShiftReconciliationsController,
  ],
  providers: [
    BusinessDayService,
    ShiftSessionsService,
    CashDrawersService,
    ShiftReconciliationsService,
  ],
  exports: [
    BusinessDayService,
    ShiftSessionsService,
    CashDrawersService,
    ShiftReconciliationsService,
  ],
})
export class BusinessDayModule {}
