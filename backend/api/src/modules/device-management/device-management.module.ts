import { Module } from '@nestjs/common';

import { DeviceSecurityPoliciesController } from './controllers/device-security-policies.controller';
import { DeviceEnrollmentsController } from './controllers/device-enrollments.controller';
import { DevicesController } from './controllers/devices.controller';
import { TerminalsController } from './controllers/terminals.controller';
import { TrustedSessionsController } from './controllers/trusted-sessions.controller';
import { DeviceEnrollmentsService } from './services/device-enrollments.service';
import { DeviceSecurityPoliciesService } from './services/device-security-policies.service';
import { DevicesService } from './services/devices.service';
import { TerminalsService } from './services/terminals.service';
import { TrustedSessionsService } from './services/trusted-sessions.service';

@Module({
  controllers: [
    DevicesController,
    DeviceEnrollmentsController,
    TrustedSessionsController,
    TerminalsController,
    DeviceSecurityPoliciesController,
  ],
  providers: [
    DevicesService,
    DeviceEnrollmentsService,
    TrustedSessionsService,
    TerminalsService,
    DeviceSecurityPoliciesService,
  ],
  exports: [
    DevicesService,
    DeviceEnrollmentsService,
    TrustedSessionsService,
    TerminalsService,
    DeviceSecurityPoliciesService,
  ],
})
export class DeviceManagementModule {}
