import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class LocalChangeLogEntry {
  const LocalChangeLogEntry({
    required this.id,
    required this.queueItemLocalId,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.actorUserId,
    required this.module,
    required this.entityType,
    required this.entityId,
    required this.operationType,
    required this.businessDate,
    required this.occurredAt,
    required this.payload,
    required this.createdAt,
  });

  final String id;
  final String queueItemLocalId;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final String actorUserId;
  final String module;
  final String entityType;
  final String entityId;
  final SyncOperationType operationType;
  final DateTime businessDate;
  final DateTime occurredAt;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
}

class LocalOrderProjection {
  const LocalOrderProjection({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.businessDate,
    required this.status,
    required this.updatedAt,
    required this.payload,
    this.orderNumber,
    this.isDirty = false,
  });

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final DateTime businessDate;
  final String? orderNumber;
  final String status;
  final DateTime updatedAt;
  final Map<String, dynamic> payload;
  final bool isDirty;
}

class LocalBillProjection {
  const LocalBillProjection({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.businessDate,
    required this.status,
    required this.totalMinor,
    required this.currencyCode,
    required this.updatedAt,
    required this.payload,
    this.orderId,
    this.billNumber,
    this.isDirty = false,
  });

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final DateTime businessDate;
  final String? orderId;
  final String? billNumber;
  final String status;
  final int totalMinor;
  final String currencyCode;
  final DateTime updatedAt;
  final Map<String, dynamic> payload;
  final bool isDirty;
}

class LocalCustomerProjection {
  const LocalCustomerProjection({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.displayName,
    required this.updatedAt,
    required this.payload,
    this.phone,
    this.email,
    this.isDirty = false,
  });

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final String displayName;
  final String? phone;
  final String? email;
  final DateTime updatedAt;
  final Map<String, dynamic> payload;
  final bool isDirty;
}

class LocalInventoryProjection {
  const LocalInventoryProjection({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.name,
    required this.quantity,
    required this.unitCode,
    required this.updatedAt,
    required this.payload,
    this.sku,
    this.isDirty = false,
  });

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final String? sku;
  final String name;
  final double quantity;
  final String unitCode;
  final DateTime updatedAt;
  final Map<String, dynamic> payload;
  final bool isDirty;
}
