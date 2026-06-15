import { Module } from '@nestjs/common';

import { OutboxEventsController } from './controllers/outbox-events.controller';
import { BackgroundJobRegistry } from './services/background-job-registry.service';
import { BackgroundJobsService } from './services/background-jobs.service';
import { BackgroundWorkerService } from './services/background-worker.service';
import { OutboxEventsService } from './services/outbox-events.service';
import { OutboxService } from './services/outbox.service';

@Module({
  controllers: [OutboxEventsController],
  providers: [
    BackgroundJobRegistry,
    BackgroundJobsService,
    BackgroundWorkerService,
    OutboxService,
    OutboxEventsService,
  ],
  exports: [BackgroundJobRegistry, BackgroundJobsService, BackgroundWorkerService, OutboxService],
})
export class OutboxModule {}
