import '../converters/date_time_converter.dart';
import '../orders/order_models.dart';

enum KitchenSlaStatus {
  onTime('ON_TIME'),
  atRisk('AT_RISK'),
  delayed('DELAYED');

  const KitchenSlaStatus(this.wireName);
  final String wireName;
  static KitchenSlaStatus fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

class KitchenCategory {
  const KitchenCategory({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.name,
    required this.displayOrder,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory KitchenCategory.fromJson(Map<String, dynamic> json) =>
      KitchenCategory(
        id: json['id'] as String,
        tenantId: json['tenantId'] as String,
        outletId: json['outletId'] as String,
        name: json['name'] as String,
        displayOrder: json['displayOrder'] as int,
        isActive: json['isActive'] as bool,
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
  final String tenantId;
  final String outletId;
  final String name;
  final int displayOrder;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class KitchenQueueItem {
  const KitchenQueueItem({
    required this.orderItem,
    required this.slaStatus,
    required this.preparationMinutes,
    this.kitchenCategory,
  });

  factory KitchenQueueItem.fromJson(Map<String, dynamic> json) =>
      KitchenQueueItem(
        orderItem: OrderItem.fromJson(json),
        slaStatus: KitchenSlaStatus.fromJson(json['slaStatus']),
        preparationMinutes: json['preparationMinutes'] as int,
        kitchenCategory: json['kitchenCategory'] is Map<String, dynamic>
            ? KitchenCategory.fromJson(
                json['kitchenCategory'] as Map<String, dynamic>,
              )
            : null,
      );

  final OrderItem orderItem;
  final KitchenSlaStatus slaStatus;
  final int preparationMinutes;
  final KitchenCategory? kitchenCategory;
}

class KitchenTicket {
  const KitchenTicket({
    required this.id,
    required this.orderNumber,
    required this.orderType,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.items,
    this.table,
    this.waiter,
    this.estimatedCompletionTime,
  });

  factory KitchenTicket.fromJson(Map<String, dynamic> json) => KitchenTicket(
    id: json['id'] as String,
    orderNumber: json['orderNumber'] as String,
    orderType: OrderType.fromJson(json['orderType']),
    status: OrderStatus.fromJson(json['status']),
    priority: OrderPriority.fromJson(json['priority']),
    createdAt: DateTimeConverter.fromJson(
      json['createdAt'],
      field: 'createdAt',
    ),
    estimatedCompletionTime: DateTimeConverter.nullableFromJson(
      json['estimatedCompletionTime'],
      field: 'estimatedCompletionTime',
    ),
    items: (json['items'] as List<dynamic>)
        .map((item) => KitchenQueueItem.fromJson(item as Map<String, dynamic>))
        .toList(growable: false),
    table: json['table'] as Map<String, dynamic>?,
    waiter: json['waiter'] as Map<String, dynamic>?,
  );

  final String id;
  final String orderNumber;
  final OrderType orderType;
  final OrderStatus status;
  final OrderPriority priority;
  final DateTime createdAt;
  final DateTime? estimatedCompletionTime;
  final List<KitchenQueueItem> items;
  final Map<String, dynamic>? table;
  final Map<String, dynamic>? waiter;
}
