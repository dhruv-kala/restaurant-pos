import { Injectable } from '@nestjs/common';
import type { OrderCreated, OrderStatusChanged, OrderUpdated } from '../enums/order-events';

@Injectable()
export class OrderEventsService {
  publishCreated(event: OrderCreated): void {
    void event;
  }

  publishUpdated(event: OrderUpdated): void {
    void event;
  }

  publishStatusChanged(event: OrderStatusChanged): void {
    void event;
  }
}
