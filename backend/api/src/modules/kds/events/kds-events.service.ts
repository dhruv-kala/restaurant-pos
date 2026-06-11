import { Injectable } from '@nestjs/common';
import type { KitchenQueueUpdated, OrderReady, OrderServed, OrderStarted } from './kds-events';

@Injectable()
export class KdsEventsService {
  publish(event: OrderStarted | OrderReady | OrderServed | KitchenQueueUpdated): void {
    void event;
  }
}
