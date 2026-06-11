import '../converters/date_time_converter.dart';

enum OrderType {
  dineIn('DINE_IN'),
  takeaway('TAKEAWAY'),
  delivery('DELIVERY'),
  qrOrder('QR_ORDER');

  const OrderType(this.wireName);
  final String wireName;
  static OrderType fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum OrderStatus {
  pending('PENDING'),
  accepted('ACCEPTED'),
  preparing('PREPARING'),
  ready('READY'),
  served('SERVED'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const OrderStatus(this.wireName);
  final String wireName;
  static OrderStatus fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum OrderItemStatus {
  pending('PENDING'),
  preparing('PREPARING'),
  ready('READY'),
  served('SERVED'),
  cancelled('CANCELLED');

  const OrderItemStatus(this.wireName);
  final String wireName;
  static OrderItemStatus fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

class OrderItem {
  const OrderItem({
    required this.id,
    required this.orderId,
    required this.menuItemId,
    required this.itemName,
    required this.quantity,
    required this.unitPrice,
    required this.discountAmount,
    required this.taxAmount,
    required this.lineTotal,
    required this.taxPercentage,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.variantId,
    this.variantName,
    this.specialInstructions,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
    id: json['id'] as String,
    orderId: json['orderId'] as String,
    menuItemId: json['menuItemId'] as String,
    variantId: json['variantId'] as String?,
    itemName: json['itemName'] as String,
    variantName: json['variantName'] as String?,
    quantity: json['quantity'] as int,
    unitPrice: json['unitPrice'] as int,
    discountAmount: json['discountAmount'] as int,
    taxAmount: json['taxAmount'] as int,
    lineTotal: json['lineTotal'] as int,
    taxPercentage: (json['taxPercentage'] as num).toDouble(),
    specialInstructions: json['specialInstructions'] as String?,
    status: OrderItemStatus.fromJson(json['status']),
    createdAt: DateTimeConverter.fromJson(
      json['createdAt'],
      field: 'createdAt',
    ),
    updatedAt: DateTimeConverter.fromJson(
      json['updatedAt'],
      field: 'updatedAt',
    ),
  );

  final String id;
  final String orderId;
  final String menuItemId;
  final String? variantId;
  final String itemName;
  final String? variantName;
  final int quantity;
  final int unitPrice;
  final int discountAmount;
  final int taxAmount;
  final int lineTotal;
  final double taxPercentage;
  final String? specialInstructions;
  final OrderItemStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class Order {
  const Order({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.orderNumber,
    required this.orderType,
    required this.status,
    required this.guestCount,
    required this.currencyCode,
    required this.subtotal,
    required this.discountAmount,
    required this.taxAmount,
    required this.serviceChargeAmount,
    required this.grandTotal,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    required this.items,
    this.tableId,
    this.customerId,
    this.waiterId,
    this.notes,
    this.cancellationReason,
    this.completedAt,
    this.cancelledAt,
    this.table,
    this.waiter,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
    id: json['id'] as String,
    tenantId: json['tenantId'] as String,
    outletId: json['outletId'] as String,
    tableId: json['tableId'] as String?,
    customerId: json['customerId'] as String?,
    orderNumber: json['orderNumber'] as String,
    orderType: OrderType.fromJson(json['orderType']),
    status: OrderStatus.fromJson(json['status']),
    waiterId: json['waiterId'] as String?,
    guestCount: json['guestCount'] as int,
    notes: json['notes'] as String?,
    currencyCode: json['currencyCode'] as String,
    subtotal: json['subtotal'] as int,
    discountAmount: json['discountAmount'] as int,
    taxAmount: json['taxAmount'] as int,
    serviceChargeAmount: json['serviceChargeAmount'] as int,
    grandTotal: json['grandTotal'] as int,
    cancellationReason: json['cancellationReason'] as String?,
    completedAt: DateTimeConverter.nullableFromJson(
      json['completedAt'],
      field: 'completedAt',
    ),
    cancelledAt: DateTimeConverter.nullableFromJson(
      json['cancelledAt'],
      field: 'cancelledAt',
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
        .map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
        .toList(growable: false),
    table: json['table'] as Map<String, dynamic>?,
    waiter: json['waiter'] as Map<String, dynamic>?,
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String? tableId;
  final String? customerId;
  final String orderNumber;
  final OrderType orderType;
  final OrderStatus status;
  final String? waiterId;
  final int guestCount;
  final String? notes;
  final String currencyCode;
  final int subtotal;
  final int discountAmount;
  final int taxAmount;
  final int serviceChargeAmount;
  final int grandTotal;
  final String? cancellationReason;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<OrderItem> items;
  final Map<String, dynamic>? table;
  final Map<String, dynamic>? waiter;
}
