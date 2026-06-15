import 'dart:convert';

import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import 'offline_local_models.dart';

class OfflineEntityMapper {
  const OfflineEntityMapper._();

  static Map<String, Object?> deviceSyncStateToRow(DeviceSyncState state) => {
    'tenant_id': state.tenantId,
    'outlet_id': state.outletId,
    'device_id': state.deviceId,
    'user_id': state.userId,
    'trusted_session_id': state.trustedSessionId,
    'sync_enabled': state.syncEnabled ? 1 : 0,
    'is_online': state.isOnline ? 1 : 0,
    'last_pull_cursor': state.lastPullCursor,
    'last_pushed_at': _optionalDate(state.lastPushedAt),
    'last_pulled_at': _optionalDate(state.lastPulledAt),
    'pending_count': state.pendingCount,
    'failed_count': state.failedCount,
    'conflict_count': state.conflictCount,
    'updated_at': _date(state.updatedAt),
  };

  static DeviceSyncState deviceSyncStateFromRow(Map<String, Object?> row) =>
      DeviceSyncState(
        tenantId: _string(row, 'tenant_id'),
        outletId: _string(row, 'outlet_id'),
        deviceId: _string(row, 'device_id'),
        userId: _string(row, 'user_id'),
        trustedSessionId: row['trusted_session_id']?.toString(),
        syncEnabled: _bool(row, 'sync_enabled'),
        isOnline: _bool(row, 'is_online'),
        lastPullCursor: row['last_pull_cursor']?.toString(),
        lastPushedAt: _optionalDateFromRow(row['last_pushed_at']),
        lastPulledAt: _optionalDateFromRow(row['last_pulled_at']),
        pendingCount: _int(row, 'pending_count'),
        failedCount: _int(row, 'failed_count'),
        conflictCount: _int(row, 'conflict_count'),
        updatedAt: _dateFromRow(row, 'updated_at'),
      );

  static Map<String, Object?> syncQueueItemToRow(SyncQueueItem item) => {
    'local_id': item.localId,
    'tenant_id': item.tenantId,
    'outlet_id': item.outletId,
    'device_id': item.deviceId,
    'actor_user_id': item.actorUserId,
    'module': item.module,
    'entity_type': item.entityType,
    'entity_id': item.entityId,
    'operation_type': item.operationType.wireName,
    'idempotency_key': item.idempotencyKey,
    'base_version': item.baseVersion,
    'business_date': _date(item.businessDate),
    'occurred_at': _date(item.occurredAt),
    'payload_json': jsonEncode(item.payload),
    'state': item.state.wireName,
    'attempt_count': item.attemptCount,
    'last_attempt_at': _optionalDate(item.lastAttemptAt),
    'next_retry_at': _optionalDate(item.nextRetryAt),
    'error_code': item.errorCode,
    'error_message': item.errorMessage,
    'created_at': _date(item.createdAt),
    'updated_at': _date(item.updatedAt),
  };

  static SyncQueueItem syncQueueItemFromRow(Map<String, Object?> row) =>
      SyncQueueItem(
        localId: _string(row, 'local_id'),
        tenantId: _string(row, 'tenant_id'),
        outletId: _string(row, 'outlet_id'),
        deviceId: _string(row, 'device_id'),
        actorUserId: _string(row, 'actor_user_id'),
        module: _string(row, 'module'),
        entityType: _string(row, 'entity_type'),
        entityId: _string(row, 'entity_id'),
        operationType: SyncOperationType.fromJson(row['operation_type']),
        idempotencyKey: _string(row, 'idempotency_key'),
        baseVersion: _optionalInt(row['base_version']),
        businessDate: _dateFromRow(row, 'business_date'),
        occurredAt: _dateFromRow(row, 'occurred_at'),
        payload: _payload(row),
        state: SyncQueueState.fromJson(row['state']),
        attemptCount: _int(row, 'attempt_count'),
        lastAttemptAt: _optionalDateFromRow(row['last_attempt_at']),
        nextRetryAt: _optionalDateFromRow(row['next_retry_at']),
        errorCode: row['error_code']?.toString(),
        errorMessage: row['error_message']?.toString(),
        createdAt: _dateFromRow(row, 'created_at'),
        updatedAt: _dateFromRow(row, 'updated_at'),
      );

  static Map<String, Object?> localChangeLogEntryToRow(
    LocalChangeLogEntry entry,
  ) => {
    'id': entry.id,
    'queue_item_local_id': entry.queueItemLocalId,
    'tenant_id': entry.tenantId,
    'outlet_id': entry.outletId,
    'device_id': entry.deviceId,
    'actor_user_id': entry.actorUserId,
    'module': entry.module,
    'entity_type': entry.entityType,
    'entity_id': entry.entityId,
    'operation_type': entry.operationType.wireName,
    'business_date': _date(entry.businessDate),
    'occurred_at': _date(entry.occurredAt),
    'payload_json': jsonEncode(entry.payload),
    'created_at': _date(entry.createdAt),
  };

  static LocalChangeLogEntry localChangeLogEntryFromRow(
    Map<String, Object?> row,
  ) => LocalChangeLogEntry(
    id: _string(row, 'id'),
    queueItemLocalId: _string(row, 'queue_item_local_id'),
    tenantId: _string(row, 'tenant_id'),
    outletId: _string(row, 'outlet_id'),
    deviceId: _string(row, 'device_id'),
    actorUserId: _string(row, 'actor_user_id'),
    module: _string(row, 'module'),
    entityType: _string(row, 'entity_type'),
    entityId: _string(row, 'entity_id'),
    operationType: SyncOperationType.fromJson(row['operation_type']),
    businessDate: _dateFromRow(row, 'business_date'),
    occurredAt: _dateFromRow(row, 'occurred_at'),
    payload: _payload(row),
    createdAt: _dateFromRow(row, 'created_at'),
  );

  static Map<String, Object?> orderToRow(LocalOrderProjection order) => {
    ..._baseProjectionToRow(order),
    'business_date': _date(order.businessDate),
    'order_number': order.orderNumber,
    'status': order.status,
  };

  static LocalOrderProjection orderFromRow(Map<String, Object?> row) =>
      LocalOrderProjection(
        id: _string(row, 'id'),
        tenantId: _string(row, 'tenant_id'),
        outletId: _string(row, 'outlet_id'),
        deviceId: _string(row, 'device_id'),
        businessDate: _dateFromRow(row, 'business_date'),
        orderNumber: row['order_number']?.toString(),
        status: _string(row, 'status'),
        updatedAt: _dateFromRow(row, 'updated_at'),
        payload: _payload(row),
        isDirty: _bool(row, 'is_dirty'),
      );

  static Map<String, Object?> billToRow(LocalBillProjection bill) => {
    ..._baseProjectionToRow(bill),
    'business_date': _date(bill.businessDate),
    'order_id': bill.orderId,
    'bill_number': bill.billNumber,
    'status': bill.status,
    'total_minor': bill.totalMinor,
    'currency_code': bill.currencyCode,
  };

  static LocalBillProjection billFromRow(Map<String, Object?> row) =>
      LocalBillProjection(
        id: _string(row, 'id'),
        tenantId: _string(row, 'tenant_id'),
        outletId: _string(row, 'outlet_id'),
        deviceId: _string(row, 'device_id'),
        businessDate: _dateFromRow(row, 'business_date'),
        orderId: row['order_id']?.toString(),
        billNumber: row['bill_number']?.toString(),
        status: _string(row, 'status'),
        totalMinor: _int(row, 'total_minor'),
        currencyCode: _string(row, 'currency_code'),
        updatedAt: _dateFromRow(row, 'updated_at'),
        payload: _payload(row),
        isDirty: _bool(row, 'is_dirty'),
      );

  static Map<String, Object?> customerToRow(LocalCustomerProjection customer) =>
      {
        ..._baseProjectionToRow(customer),
        'display_name': customer.displayName,
        'phone': customer.phone,
        'email': customer.email,
      };

  static LocalCustomerProjection customerFromRow(Map<String, Object?> row) =>
      LocalCustomerProjection(
        id: _string(row, 'id'),
        tenantId: _string(row, 'tenant_id'),
        outletId: _string(row, 'outlet_id'),
        deviceId: _string(row, 'device_id'),
        displayName: _string(row, 'display_name'),
        phone: row['phone']?.toString(),
        email: row['email']?.toString(),
        updatedAt: _dateFromRow(row, 'updated_at'),
        payload: _payload(row),
        isDirty: _bool(row, 'is_dirty'),
      );

  static Map<String, Object?> inventoryToRow(
    LocalInventoryProjection inventory,
  ) => {
    ..._baseProjectionToRow(inventory),
    'sku': inventory.sku,
    'name': inventory.name,
    'quantity': inventory.quantity,
    'unit_code': inventory.unitCode,
  };

  static LocalInventoryProjection inventoryFromRow(Map<String, Object?> row) =>
      LocalInventoryProjection(
        id: _string(row, 'id'),
        tenantId: _string(row, 'tenant_id'),
        outletId: _string(row, 'outlet_id'),
        deviceId: _string(row, 'device_id'),
        sku: row['sku']?.toString(),
        name: _string(row, 'name'),
        quantity: _double(row, 'quantity'),
        unitCode: _string(row, 'unit_code'),
        updatedAt: _dateFromRow(row, 'updated_at'),
        payload: _payload(row),
        isDirty: _bool(row, 'is_dirty'),
      );

  static Map<String, Object?> _baseProjectionToRow(Object projection) {
    final id = switch (projection) {
      LocalOrderProjection value => value.id,
      LocalBillProjection value => value.id,
      LocalCustomerProjection value => value.id,
      LocalInventoryProjection value => value.id,
      _ => throw ArgumentError.value(projection, 'projection'),
    };
    final tenantId = switch (projection) {
      LocalOrderProjection value => value.tenantId,
      LocalBillProjection value => value.tenantId,
      LocalCustomerProjection value => value.tenantId,
      LocalInventoryProjection value => value.tenantId,
      _ => throw ArgumentError.value(projection, 'projection'),
    };
    final outletId = switch (projection) {
      LocalOrderProjection value => value.outletId,
      LocalBillProjection value => value.outletId,
      LocalCustomerProjection value => value.outletId,
      LocalInventoryProjection value => value.outletId,
      _ => throw ArgumentError.value(projection, 'projection'),
    };
    final deviceId = switch (projection) {
      LocalOrderProjection value => value.deviceId,
      LocalBillProjection value => value.deviceId,
      LocalCustomerProjection value => value.deviceId,
      LocalInventoryProjection value => value.deviceId,
      _ => throw ArgumentError.value(projection, 'projection'),
    };
    final updatedAt = switch (projection) {
      LocalOrderProjection value => value.updatedAt,
      LocalBillProjection value => value.updatedAt,
      LocalCustomerProjection value => value.updatedAt,
      LocalInventoryProjection value => value.updatedAt,
      _ => throw ArgumentError.value(projection, 'projection'),
    };
    final payload = switch (projection) {
      LocalOrderProjection value => value.payload,
      LocalBillProjection value => value.payload,
      LocalCustomerProjection value => value.payload,
      LocalInventoryProjection value => value.payload,
      _ => throw ArgumentError.value(projection, 'projection'),
    };
    final isDirty = switch (projection) {
      LocalOrderProjection value => value.isDirty,
      LocalBillProjection value => value.isDirty,
      LocalCustomerProjection value => value.isDirty,
      LocalInventoryProjection value => value.isDirty,
      _ => throw ArgumentError.value(projection, 'projection'),
    };

    return {
      'id': id,
      'tenant_id': tenantId,
      'outlet_id': outletId,
      'device_id': deviceId,
      'updated_at': _date(updatedAt),
      'payload_json': jsonEncode(payload),
      'is_dirty': isDirty ? 1 : 0,
    };
  }

  static String _date(DateTime value) => value.toUtc().toIso8601String();

  static String? _optionalDate(DateTime? value) =>
      value == null ? null : _date(value);

  static String _string(Map<String, Object?> row, String key) {
    final value = row[key];
    if (value is String) return value;
    throw FormatException('Expected string for $key.');
  }

  static int _int(Map<String, Object?> row, String key) {
    final value = row[key];
    if (value is int) return value;
    if (value is num) return value.toInt();
    throw FormatException('Expected integer for $key.');
  }

  static int? _optionalInt(Object? value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    return null;
  }

  static double _double(Map<String, Object?> row, String key) {
    final value = row[key];
    if (value is double) return value;
    if (value is num) return value.toDouble();
    throw FormatException('Expected number for $key.');
  }

  static bool _bool(Map<String, Object?> row, String key) {
    final value = row[key];
    if (value is bool) return value;
    if (value is int) return value == 1;
    if (value is num) return value.toInt() == 1;
    throw FormatException('Expected boolean integer for $key.');
  }

  static DateTime _dateFromRow(Map<String, Object?> row, String key) {
    final value = row[key];
    if (value is String) return DateTime.parse(value);
    throw FormatException('Expected date string for $key.');
  }

  static DateTime? _optionalDateFromRow(Object? value) =>
      value is String ? DateTime.parse(value) : null;

  static Map<String, dynamic> _payload(Map<String, Object?> row) {
    final value = row['payload_json'];
    if (value is! String) {
      throw const FormatException('Expected JSON payload string.');
    }
    final decoded = jsonDecode(value);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    if (decoded is Map) {
      return Map<String, dynamic>.from(decoded);
    }
    throw const FormatException('Expected JSON payload object.');
  }
}
