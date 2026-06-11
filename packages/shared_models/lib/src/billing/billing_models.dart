import '../converters/date_time_converter.dart';

enum BillStatus {
  draft('DRAFT'),
  generated('GENERATED'),
  paid('PAID'),
  voided('VOID'),
  refunded('REFUNDED');

  const BillStatus(this.wireName);
  final String wireName;
  static BillStatus fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum BillSource {
  pos('POS'),
  waiter('WAITER'),
  qr('QR'),
  online('ONLINE'),
  customerApp('CUSTOMER_APP');

  const BillSource(this.wireName);
  final String wireName;
  static BillSource fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum BillPaymentStatus {
  unpaid('UNPAID'),
  partiallyPaid('PARTIALLY_PAID'),
  paid('PAID'),
  refunded('REFUNDED');

  const BillPaymentStatus(this.wireName);
  final String wireName;
  static BillPaymentStatus fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum SplitBillMode {
  equal('EQUAL'),
  customAmount('CUSTOM_AMOUNT'),
  itemBased('ITEM_BASED');

  const SplitBillMode(this.wireName);
  final String wireName;
}

class BillItem {
  const BillItem({
    required this.id,
    required this.orderItemId,
    required this.menuItemId,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.discountAmount,
    required this.taxAmount,
    required this.taxPercentage,
    required this.lineTotal,
    this.kitchenCategoryId,
    this.preparationTimeMinutes,
  });

  factory BillItem.fromJson(Map<String, dynamic> json) => BillItem(
    id: json['id'] as String,
    orderItemId: json['orderItemId'] as String,
    menuItemId: json['menuItemId'] as String,
    kitchenCategoryId: json['kitchenCategoryId'] as String?,
    name: json['name'] as String,
    quantity: json['quantity'] as int,
    unitPrice: json['unitPrice'] as int,
    discountAmount: json['discountAmount'] as int,
    taxAmount: json['taxAmount'] as int,
    taxPercentage: (json['taxPercentage'] as num).toDouble(),
    lineTotal: json['lineTotal'] as int,
    preparationTimeMinutes: json['preparationTimeMinutes'] as int?,
  );

  final String id;
  final String orderItemId;
  final String menuItemId;
  final String? kitchenCategoryId;
  final String name;
  final int quantity;
  final int unitPrice;
  final int discountAmount;
  final int taxAmount;
  final double taxPercentage;
  final int lineTotal;
  final int? preparationTimeMinutes;
}

class BillTax {
  const BillTax({
    required this.id,
    required this.taxName,
    required this.taxRate,
    required this.taxAmount,
  });

  factory BillTax.fromJson(Map<String, dynamic> json) => BillTax(
    id: json['id'] as String,
    taxName: json['taxName'] as String,
    taxRate: (json['taxRate'] as num).toDouble(),
    taxAmount: json['taxAmount'] as int,
  );

  final String id;
  final String taxName;
  final double taxRate;
  final int taxAmount;
}

class Bill {
  const Bill({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.orderId,
    required this.billNumber,
    required this.status,
    required this.paymentStatus,
    required this.billSource,
    required this.currencyCode,
    required this.subtotal,
    required this.discountAmount,
    required this.taxAmount,
    required this.serviceChargeAmount,
    required this.roundOffAmount,
    required this.grandTotal,
    required this.paidAmount,
    required this.refundedAmount,
    required this.outstandingAmount,
    required this.generatedByUserId,
    required this.generatedAt,
    required this.printCount,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    required this.items,
    required this.taxes,
    required this.order,
    this.invoiceNumber,
    this.customerName,
    this.customerPhone,
    this.customerGSTNumber,
    this.loyaltyPointsEarned = 0,
    this.loyaltyPointsRedeemed = 0,
    this.couponCode,
    this.couponDiscountAmount = 0,
    this.notes,
    this.sourceBillIds = const <String>[],
    this.voidReason,
    this.voidedByUserId,
    this.voidedAt,
    this.lastPrintedAt,
    this.generatedBy,
    this.voidedBy,
  });

  factory Bill.fromJson(Map<String, dynamic> json) => Bill(
    id: json['id'] as String,
    tenantId: json['tenantId'] as String,
    outletId: json['outletId'] as String,
    orderId: json['orderId'] as String,
    billNumber: json['billNumber'] as String,
    invoiceNumber: json['invoiceNumber'] as String?,
    status: BillStatus.fromJson(json['status']),
    paymentStatus: BillPaymentStatus.fromJson(
      json['paymentStatus'] ?? 'UNPAID',
    ),
    billSource: BillSource.fromJson(json['billSource']),
    currencyCode: json['currencyCode'] as String,
    customerName: json['customerName'] as String?,
    customerPhone: json['customerPhone'] as String?,
    customerGSTNumber: json['customerGSTNumber'] as String?,
    subtotal: json['subtotal'] as int,
    discountAmount: json['discountAmount'] as int,
    taxAmount: json['taxAmount'] as int,
    serviceChargeAmount: json['serviceChargeAmount'] as int,
    roundOffAmount: json['roundOffAmount'] as int,
    grandTotal: json['grandTotal'] as int,
    paidAmount: json['paidAmount'] as int? ?? 0,
    refundedAmount: json['refundedAmount'] as int? ?? 0,
    outstandingAmount:
        json['outstandingAmount'] as int? ?? json['grandTotal'] as int,
    loyaltyPointsEarned: json['loyaltyPointsEarned'] as int? ?? 0,
    loyaltyPointsRedeemed: json['loyaltyPointsRedeemed'] as int? ?? 0,
    couponCode: json['couponCode'] as String?,
    couponDiscountAmount: json['couponDiscountAmount'] as int? ?? 0,
    notes: json['notes'] as String?,
    sourceBillIds:
        (json['sourceBillIds'] as List<dynamic>?)?.cast<String>() ??
        const <String>[],
    generatedByUserId: json['generatedByUserId'] as String,
    generatedAt: DateTimeConverter.fromJson(
      json['generatedAt'],
      field: 'generatedAt',
    ),
    voidReason: json['voidReason'] as String?,
    voidedByUserId: json['voidedByUserId'] as String?,
    voidedAt: DateTimeConverter.nullableFromJson(
      json['voidedAt'],
      field: 'voidedAt',
    ),
    printCount: json['printCount'] as int,
    lastPrintedAt: DateTimeConverter.nullableFromJson(
      json['lastPrintedAt'],
      field: 'lastPrintedAt',
    ),
    version: json['version'] as int,
    createdAt: DateTimeConverter.fromJson(
      json['createdAt'],
      field: 'createdAt',
    ),
    updatedAt: DateTimeConverter.fromJson(
      json['updatedAt'],
      field: 'updatedAt',
    ),
    items: (json['items'] as List<dynamic>)
        .map((item) => BillItem.fromJson(item as Map<String, dynamic>))
        .toList(growable: false),
    taxes: (json['taxes'] as List<dynamic>)
        .map((item) => BillTax.fromJson(item as Map<String, dynamic>))
        .toList(growable: false),
    order: json['order'] as Map<String, dynamic>,
    generatedBy: json['generatedBy'] as Map<String, dynamic>?,
    voidedBy: json['voidedBy'] as Map<String, dynamic>?,
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String orderId;
  final String billNumber;
  final String? invoiceNumber;
  final BillStatus status;
  final BillPaymentStatus paymentStatus;
  final BillSource billSource;
  final String currencyCode;
  final String? customerName;
  final String? customerPhone;
  final String? customerGSTNumber;
  final int subtotal;
  final int discountAmount;
  final int taxAmount;
  final int serviceChargeAmount;
  final int roundOffAmount;
  final int grandTotal;
  final int paidAmount;
  final int refundedAmount;
  final int outstandingAmount;
  final int loyaltyPointsEarned;
  final int loyaltyPointsRedeemed;
  final String? couponCode;
  final int couponDiscountAmount;
  final String? notes;
  final List<String> sourceBillIds;
  final String generatedByUserId;
  final DateTime generatedAt;
  final String? voidReason;
  final String? voidedByUserId;
  final DateTime? voidedAt;
  final int printCount;
  final DateTime? lastPrintedAt;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<BillItem> items;
  final List<BillTax> taxes;
  final Map<String, dynamic> order;
  final Map<String, dynamic>? generatedBy;
  final Map<String, dynamic>? voidedBy;
}
