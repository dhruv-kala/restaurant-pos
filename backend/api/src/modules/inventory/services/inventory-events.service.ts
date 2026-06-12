import { Injectable } from '@nestjs/common';
import type { InventoryDomainEvent } from '../enums/inventory-events';

@Injectable()
export class InventoryEventsService {
  publish(event: InventoryDomainEvent): void {
    void event;
    // Durable transport is intentionally deferred; this is the typed integration boundary.
  }
}
