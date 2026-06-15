import { Module } from '@nestjs/common';

import { DeviceEnrollmentsController } from './controllers/device-enrollments.controller';
import { DevicesController } from './controllers/devices.controller';
import { TerminalsController } from './controllers/terminals.controller';
import { TrustedSessionsController } from './controllers/trusted-sessions.controller';
import { DeviceEnrollmentsService } from './services/device-enrollments.service';
import { DevicesService } from './services/devices.service';
import { TerminalsService } from './services/terminals.service';
import { TrustedSessionsService } from './services/trusted-sessions.service';

@Module({
  controllers: [
    DevicesController,
    DeviceEnrollmentsController,
    TrustedSessionsController,
    TerminalsController,
  ],
  providers: [DevicesService, DeviceEnrollmentsService, TrustedSessionsService, TerminalsService],
  exports: [DevicesService, DeviceEnrollmentsService, TrustedSessionsService, TerminalsService],
})
export class DeviceManagementModule {}
