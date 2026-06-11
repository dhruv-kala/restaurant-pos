export interface OrderCreated {
  type: 'OrderCreated';
  tenantId: string;
  outletId: string;
  orderId: string;
}

export interface OrderStarted {
  type: 'OrderStarted';
  tenantId: string;
  outletId: string;
  orderId: string;
}

export interface OrderReady {
  type: 'OrderReady';
  tenantId: string;
  outletId: string;
  orderId: string;
}

export interface OrderServed {
  type: 'OrderServed';
  tenantId: string;
  outletId: string;
  orderId: string;
}

export interface KitchenQueueUpdated {
  type: 'KitchenQueueUpdated';
  tenantId: string;
  outletId: string;
  kitchenCategoryId?: string;
}
