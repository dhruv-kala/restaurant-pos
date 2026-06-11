export const KitchenEvent = {
  queueUpdated: 'KitchenQueueUpdated',
  orderCreated: 'OrderCreated',
  orderUpdated: 'OrderUpdated',
  orderReady: 'OrderReady',
  orderServed: 'OrderServed',
  itemReady: 'ItemReady',
  itemServed: 'ItemServed',
} as const;

export type KitchenEventName = (typeof KitchenEvent)[keyof typeof KitchenEvent];

export interface KitchenRealtimeEvent {
  type: KitchenEventName;
  tenantId: string;
  outletId: string;
  stationId?: string;
  orderId?: string;
  itemId?: string;
  occurredAt: string;
}
