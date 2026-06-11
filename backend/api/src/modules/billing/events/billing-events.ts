export interface BillingEvent {
  tenantId: string;
  outletId: string;
  billId: string;
}

export interface BillGenerated extends BillingEvent {
  type: 'BillGenerated';
}
export interface BillPaid extends BillingEvent {
  type: 'BillPaid';
}
export interface BillVoided extends BillingEvent {
  type: 'BillVoided';
}
