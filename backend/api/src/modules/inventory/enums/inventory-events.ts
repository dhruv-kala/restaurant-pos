export const InventoryEvent = {
  stockAdjusted: 'StockAdjusted',
  stockTransferred: 'StockTransferred',
  purchaseOrderReceived: 'PurchaseOrderReceived',
  inventoryAlertCreated: 'InventoryAlertCreated',
} as const;

export type InventoryEventName = (typeof InventoryEvent)[keyof typeof InventoryEvent];

export interface InventoryDomainEvent {
  type: InventoryEventName;
  tenantId: string;
  outletId: string;
  ingredientId?: string;
  referenceId?: string;
  occurredAt: string;
}
