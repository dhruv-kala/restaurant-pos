import { Module } from '@nestjs/common';

import { DeviceEnrollmentsController } from './controllers/device-enrollments.controller';
import { DevicesController } from './controllers/devices.controller';
import { TrustedSessionsController } from './controllers/trusted-sessions.controller';
import { DeviceEnrollmentsService } from './services/device-enrollments.service';
import { DevicesService } from './services/devices.service';
import { TrustedSessionsService } from './services/trusted-sessions.service';

@Module({
  controllers: [DevicesController, DeviceEnrollmentsController, TrustedSessionsController],
  providers: [DevicesService, DeviceEnrollmentsService, TrustedSessionsService],
  exports: [DevicesService, DeviceEnrollmentsService, TrustedSessionsService],
})
export class DeviceManagementModule {}
