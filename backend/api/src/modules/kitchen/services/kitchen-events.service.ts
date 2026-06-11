import { Injectable } from '@nestjs/common';
import type { KitchenRealtimeEvent } from '../enums/kitchen-events';
import { KitchenGateway } from '../gateways/kitchen.gateway';

@Injectable()
export class KitchenEventsService {
  constructor(private readonly gateway: KitchenGateway) {}

  publish(event: Omit<KitchenRealtimeEvent, 'occurredAt'>): void {
    this.gateway.publish({ ...event, occurredAt: new Date().toISOString() });
  }
}
