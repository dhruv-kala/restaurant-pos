import { Injectable } from '@nestjs/common';
import { KitchenEvent } from '../../kitchen/enums/kitchen-events';
import { KitchenEventsService } from '../../kitchen/services/kitchen-events.service';
import type { OrderCreated, OrderStatusChanged, OrderUpdated } from '../enums/order-events';

@Injectable()
export class OrderEventsService {
  constructor(private readonly kitchenEvents: KitchenEventsService) {}

  publishCreated(event: OrderCreated): void {
    this.kitchenEvents.publish({
      type: KitchenEvent.orderCreated,
      tenantId: event.tenantId,
      outletId: event.outletId,
      orderId: event.orderId,
    });
    this.queueUpdated(event);
  }

  publishUpdated(event: OrderUpdated): void {
    this.kitchenEvents.publish({
      type: KitchenEvent.orderUpdated,
      tenantId: event.tenantId,
      outletId: event.outletId,
      orderId: event.orderId,
    });
    this.queueUpdated(event);
  }

  publishStatusChanged(event: OrderStatusChanged): void {
    const type =
      event.status === 'READY'
        ? KitchenEvent.orderReady
        : event.status === 'SERVED'
          ? KitchenEvent.orderServed
          : KitchenEvent.orderUpdated;
    this.kitchenEvents.publish({
      type,
      tenantId: event.tenantId,
      outletId: event.outletId,
      orderId: event.orderId,
    });
    this.queueUpdated(event);
  }

  private queueUpdated(event: { tenantId: string; outletId: string }): void {
    this.kitchenEvents.publish({
      type: KitchenEvent.queueUpdated,
      tenantId: event.tenantId,
      outletId: event.outletId,
    });
  }
}
