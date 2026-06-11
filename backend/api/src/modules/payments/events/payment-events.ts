export interface PaymentEvent {
  tenantId: string;
  outletId: string;
  paymentId: string;
}
export interface PaymentCreated extends PaymentEvent {
  type: 'PaymentCreated';
}
export interface PaymentCompleted extends PaymentEvent {
  type: 'PaymentCompleted';
}
export interface PaymentFailed extends PaymentEvent {
  type: 'PaymentFailed';
}
export interface PaymentRefunded extends PaymentEvent {
  type: 'PaymentRefunded';
}
