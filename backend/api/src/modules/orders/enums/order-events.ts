export interface OrderCreated {
  type: 'OrderCreated';
  tenantId: string;
  outletId: string;
  orderId: string;
}

export interface OrderUpdated {
  type: 'OrderUpdated';
  tenantId: string;
  outletId: string;
  orderId: string;
}

export interface OrderStatusChanged {
  type: 'OrderStatusChanged';
  tenantId: string;
  outletId: string;
  orderId: string;
  status: string;
}
