import { Module } from '@nestjs/common';

import { DeviceEnrollmentsController } from './controllers/device-enrollments.controller';
import { DevicesController } from './controllers/devices.controller';
import { DeviceEnrollmentsService } from './services/device-enrollments.service';
import { DevicesService } from './services/devices.service';

@Module({
  controllers: [DevicesController, DeviceEnrollmentsController],
  providers: [DevicesService, DeviceEnrollmentsService],
  exports: [DevicesService, DeviceEnrollmentsService],
})
export class DeviceManagementModule {}
