import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/payment_query.dart';

class PaymentsRepository {
  const PaymentsRepository(this._payments, this._billing);
  final PaymentsApiService _payments;
  final BillingApiService _billing;

  Future<Bill> bill(String id) => _billing.getBill(id);
  Future<Payment> payment(String id) => _payments.getPayment(id);
  Future<PaginatedResponse<Payment>> payments(PaymentQuery query) =>
      _payments.getPayments(
        page: query.page,
        status: query.status,
        paymentMethod: query.paymentMethod,
        billId: query.billId,
        referenceNumber: query.referenceNumber,
      );
  Future<Payment> create(Map<String, dynamic> data) =>
      _payments.createPayment(data);
  Future<Payment> split(Map<String, dynamic> data) =>
      _payments.splitPayment(data);
  Future<Payment> refund(String id, int amount, String reason) =>
      _payments.refundPayment(id, amount, reason);
  Future<Payment> status(String id, PaymentStatus status) =>
      _payments.updatePaymentStatus(id, status);
}
