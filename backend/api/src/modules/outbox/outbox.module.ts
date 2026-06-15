import { Module } from '@nestjs/common';

import { OutboxEventsController } from './controllers/outbox-events.controller';
import { OutboxEventsService } from './services/outbox-events.service';
import { OutboxService } from './services/outbox.service';

@Module({
  controllers: [OutboxEventsController],
  providers: [OutboxService, OutboxEventsService],
  exports: [OutboxService],
})
export class OutboxModule {}
