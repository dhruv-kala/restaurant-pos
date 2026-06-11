import '../converters/date_time_converter.dart';

enum PaymentMethod {
  cash('CASH'),
  upi('UPI'),
  card('CARD'),
  wallet('WALLET'),
  giftCard('GIFT_CARD'),
  bankTransfer('BANK_TRANSFER');

  const PaymentMethod(this.wireName);
  final String wireName;
  static PaymentMethod fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum PaymentStatus {
  pending('PENDING'),
  processing('PROCESSING'),
  success('SUCCESS'),
  failed('FAILED'),
  partiallyPaid('PARTIALLY_PAID'),
  refunded('REFUNDED'),
  cancelled('CANCELLED');

  const PaymentStatus(this.wireName);
  final String wireName;
  static PaymentStatus fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum RefundStatus {
  pending('PENDING'),
  approved('APPROVED'),
  completed('COMPLETED'),
  rejected('REJECTED');

  const RefundStatus(this.wireName);
  final String wireName;
  static RefundStatus fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum PaymentSource {
  pos('POS'),
  waiterApp('WAITER_APP'),
  qrOrder('QR_ORDER'),
  onlineOrder('ONLINE_ORDER'),
  customerApp('CUSTOMER_APP');

  const PaymentSource(this.wireName);
  final String wireName;
  static PaymentSource fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

class PaymentTransaction {
  const PaymentTransaction({
    required this.id,
    required this.paymentMethod,
    required this.amount,
    required this.status,
    required this.createdAt,
    this.referenceNumber,
    this.gatewayTransactionId,
    this.upiTransactionId,
    this.payerName,
    this.cardLast4,
    this.approvalCode,
    this.cashReceived,
    this.changeReturned,
  });

  factory PaymentTransaction.fromJson(Map<String, dynamic> json) =>
      PaymentTransaction(
        id: json['id'] as String,
        paymentMethod: PaymentMethod.fromJson(json['paymentMethod']),
        amount: json['amount'] as int,
        referenceNumber: json['referenceNumber'] as String?,
        gatewayTransactionId: json['gatewayTransactionId'] as String?,
        upiTransactionId: json['upiTransactionId'] as String?,
        payerName: json['payerName'] as String?,
        cardLast4: json['cardLast4'] as String?,
        approvalCode: json['approvalCode'] as String?,
        cashReceived: json['cashReceived'] as int?,
        changeReturned: json['changeReturned'] as int?,
        status: PaymentStatus.fromJson(json['status']),
        createdAt: DateTimeConverter.fromJson(
          json['createdAt'],
          field: 'createdAt',
        ),
      );

  final String id;
  final PaymentMethod paymentMethod;
  final int amount;
  final String? referenceNumber;
  final String? gatewayTransactionId;
  final String? upiTransactionId;
  final String? payerName;
  final String? cardLast4;
  final String? approvalCode;
  final int? cashReceived;
  final int? changeReturned;
  final PaymentStatus status;
  final DateTime createdAt;
}

class PaymentRefund {
  const PaymentRefund({
    required this.id,
    required this.refundNumber,
    required this.refundAmount,
    required this.refundReason,
    required this.status,
    required this.refundedByUserId,
    required this.createdAt,
    this.refundedAt,
  });

  factory PaymentRefund.fromJson(Map<String, dynamic> json) => PaymentRefund(
    id: json['id'] as String,
    refundNumber: json['refundNumber'] as String,
    refundAmount: json['refundAmount'] as int,
    refundReason: json['refundReason'] as String,
    status: RefundStatus.fromJson(json['status']),
    refundedByUserId: json['refundedByUserId'] as String,
    refundedAt: DateTimeConverter.nullableFromJson(
      json['refundedAt'],
      field: 'refundedAt',
    ),
    createdAt: DateTimeConverter.fromJson(
      json['createdAt'],
      field: 'createdAt',
    ),
  );

  final String id;
  final String refundNumber;
  final int refundAmount;
  final String refundReason;
  final RefundStatus status;
  final String refundedByUserId;
  final DateTime? refundedAt;
  final DateTime createdAt;
}

class Payment {
  const Payment({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.billId,
    required this.paymentNumber,
    required this.paymentSource,
    required this.status,
    required this.amount,
    required this.paidAmount,
    required this.refundedAmount,
    required this.businessDate,
    required this.createdByUserId,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    required this.transactions,
    required this.refunds,
    required this.bill,
    this.paymentMethod,
    this.referenceNumber,
    this.gatewayTransactionId,
    this.upiTransactionId,
    this.payerName,
    this.cardLast4,
    this.approvalCode,
    this.cashReceived,
    this.changeReturned,
    this.gatewayName,
    this.gatewayReference,
    this.deviceId,
    this.terminalId,
    this.shiftId,
    this.notes,
    this.paidByUserId,
    this.paidAt,
    this.createdBy,
    this.paidBy,
  });

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
    id: json['id'] as String,
    tenantId: json['tenantId'] as String,
    outletId: json['outletId'] as String,
    billId: json['billId'] as String,
    paymentNumber: json['paymentNumber'] as String,
    paymentMethod: json['paymentMethod'] == null
        ? null
        : PaymentMethod.fromJson(json['paymentMethod']),
    paymentSource: PaymentSource.fromJson(json['paymentSource']),
    status: PaymentStatus.fromJson(json['status']),
    amount: json['amount'] as int,
    paidAmount: json['paidAmount'] as int,
    refundedAmount: json['refundedAmount'] as int,
    referenceNumber: json['referenceNumber'] as String?,
    gatewayTransactionId: json['gatewayTransactionId'] as String?,
    upiTransactionId: json['upiTransactionId'] as String?,
    payerName: json['payerName'] as String?,
    cardLast4: json['cardLast4'] as String?,
    approvalCode: json['approvalCode'] as String?,
    cashReceived: json['cashReceived'] as int?,
    changeReturned: json['changeReturned'] as int?,
    gatewayName: json['gatewayName'] as String?,
    gatewayReference: json['gatewayReference'] as String?,
    deviceId: json['deviceId'] as String?,
    terminalId: json['terminalId'] as String?,
    shiftId: json['shiftId'] as String?,
    businessDate: DateTimeConverter.fromJson(
      json['businessDate'],
      field: 'businessDate',
    ),
    notes: json['notes'] as String?,
    createdByUserId: json['createdByUserId'] as String,
    paidByUserId: json['paidByUserId'] as String?,
    paidAt: DateTimeConverter.nullableFromJson(json['paidAt'], field: 'paidAt'),
    version: json['version'] as int,
    createdAt: DateTimeConverter.fromJson(
      json['createdAt'],
      field: 'createdAt',
    ),
    updatedAt: DateTimeConverter.fromJson(
      json['updatedAt'],
      field: 'updatedAt',
    ),
    transactions: (json['transactions'] as List<dynamic>)
        .map(
          (item) => PaymentTransaction.fromJson(item as Map<String, dynamic>),
        )
        .toList(growable: false),
    refunds: (json['refunds'] as List<dynamic>)
        .map((item) => PaymentRefund.fromJson(item as Map<String, dynamic>))
        .toList(growable: false),
    bill: json['bill'] as Map<String, dynamic>,
    createdBy: json['createdBy'] as Map<String, dynamic>?,
    paidBy: json['paidBy'] as Map<String, dynamic>?,
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String billId;
  final String paymentNumber;
  final PaymentMethod? paymentMethod;
  final PaymentSource paymentSource;
  final PaymentStatus status;
  final int amount;
  final int paidAmount;
  final int refundedAmount;
  final String? referenceNumber;
  final String? gatewayTransactionId;
  final String? upiTransactionId;
  final String? payerName;
  final String? cardLast4;
  final String? approvalCode;
  final int? cashReceived;
  final int? changeReturned;
  final String? gatewayName;
  final String? gatewayReference;
  final String? deviceId;
  final String? terminalId;
  final String? shiftId;
  final DateTime businessDate;
  final String? notes;
  final String createdByUserId;
  final String? paidByUserId;
  final DateTime? paidAt;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<PaymentTransaction> transactions;
  final List<PaymentRefund> refunds;
  final Map<String, dynamic> bill;
  final Map<String, dynamic>? createdBy;
  final Map<String, dynamic>? paidBy;
}
