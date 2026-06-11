import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class PaymentQuery {
  const PaymentQuery({
    this.page = 1,
    this.status,
    this.paymentMethod,
    this.billId,
    this.referenceNumber,
  });

  final int page;
  final PaymentStatus? status;
  final PaymentMethod? paymentMethod;
  final String? billId;
  final String? referenceNumber;

  @override
  bool operator ==(Object other) =>
      other is PaymentQuery &&
      other.page == page &&
      other.status == status &&
      other.paymentMethod == paymentMethod &&
      other.billId == billId &&
      other.referenceNumber == referenceNumber;

  @override
  int get hashCode =>
      Object.hash(page, status, paymentMethod, billId, referenceNumber);
}
