import { Module } from '@nestjs/common';

import { JobsController } from './controllers/jobs.controller';
import { OutboxEventsController } from './controllers/outbox-events.controller';
import { SchedulerController } from './controllers/scheduler.controller';
import { BackgroundJobRegistry } from './services/background-job-registry.service';
import { BackgroundJobsService } from './services/background-jobs.service';
import { BackgroundWorkerService } from './services/background-worker.service';
import { JobRecoveryService } from './services/job-recovery.service';
import { OutboxEventsService } from './services/outbox-events.service';
import { OutboxService } from './services/outbox.service';
import { SchedulerService } from './services/scheduler.service';

@Module({
  controllers: [OutboxEventsController, JobsController, SchedulerController],
  providers: [
    BackgroundJobRegistry,
    BackgroundJobsService,
    BackgroundWorkerService,
    JobRecoveryService,
    OutboxService,
    OutboxEventsService,
    SchedulerService,
  ],
  exports: [
    BackgroundJobRegistry,
    BackgroundJobsService,
    BackgroundWorkerService,
    OutboxService,
    SchedulerService,
  ],
})
export class OutboxModule {}
