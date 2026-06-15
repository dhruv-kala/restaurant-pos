import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import 'offline_local_models.dart';
import 'offline_local_repository.dart';

class OfflineInventoryCustomerContext {
  const OfflineInventoryCustomerContext({
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.actorUserId,
    required this.businessDate,
  });

  final String tenantId;
  final String outletId;
  final String deviceId;
  final String actorUserId;
  final DateTime businessDate;
}

class OfflineCustomerDraft {
  const OfflineCustomerDraft({
    required this.displayName,
    this.phone,
    this.email,
    this.customerType = CustomerType.walkIn,
    this.status = CustomerStatus.active,
    this.source = CustomerSource.pos,
    this.notes,
  });

  final String displayName;
  final String? phone;
  final String? email;
  final CustomerType customerType;
  final CustomerStatus status;
  final CustomerSource source;
  final String? notes;
}

class OfflineCustomerUpdateDraft {
  const OfflineCustomerUpdateDraft({
    this.displayName,
    this.phone,
    this.email,
    this.customerType,
    this.status,
    this.notes,
  });

  final String? displayName;
  final String? phone;
  final String? email;
  final CustomerType? customerType;
  final CustomerStatus? status;
  final String? notes;
}

class OfflineInventoryAdjustmentDraft {
  const OfflineInventoryAdjustmentDraft({
    required this.inventoryItemId,
    required this.quantityDelta,
    required this.reason,
    this.transactionType,
    this.referenceNumber,
  });

  final String inventoryItemId;
  final double quantityDelta;
  final String reason;
  final StockTransactionType? transactionType;
  final String? referenceNumber;
}

class OfflineInventoryCustomerOperationsService {
  factory OfflineInventoryCustomerOperationsService({
    required OfflineLocalRepository repository,
    String Function(String prefix)? idFactory,
    DateTime Function()? nowFactory,
  }) => OfflineInventoryCustomerOperationsService._(
    repository,
    idFactory ?? _defaultIdFactory,
    nowFactory ?? (() => DateTime.now().toUtc()),
  );

  OfflineInventoryCustomerOperationsService._(
    this._repository,
    this._idFactory,
    this._nowFactory,
  );

  final OfflineLocalRepository _repository;
  final String Function(String prefix) _idFactory;
  final DateTime Function() _nowFactory;

  Future<List<LocalCustomerProjection>> lookupCustomers({
    required OfflineInventoryCustomerContext context,
    required String query,
  }) {
    return _repository.searchCustomers(
      tenantId: context.tenantId,
      outletId: context.outletId,
      query: query,
    );
  }

  Future<LocalCustomerProjection> createCustomer({
    required OfflineInventoryCustomerContext context,
    required OfflineCustomerDraft draft,
  }) async {
    final displayName = draft.displayName.trim();
    if (displayName.isEmpty) {
      throw ArgumentError('Offline customers require a display name.');
    }

    final now = _nowFactory();
    final customerId = _idFactory('customer');
    final payload = {
      'id': customerId,
      'displayName': displayName,
      'phone': _normalizedOptional(draft.phone),
      'email': _normalizedEmail(draft.email),
      'customerType': draft.customerType.wireName,
      'status': draft.status.wireName,
      'source': _customerSourceWireName(draft.source),
      'notes': _normalizedOptional(draft.notes),
      'createdOffline': true,
      'createdAt': now.toUtc().toIso8601String(),
    };
    final customer = LocalCustomerProjection(
      id: customerId,
      tenantId: context.tenantId,
      outletId: context.outletId,
      deviceId: context.deviceId,
      displayName: displayName,
      phone: _normalizedOptional(draft.phone),
      email: _normalizedEmail(draft.email),
      updatedAt: now,
      payload: payload,
      isDirty: true,
    );
    final queueItem = _queueItem(
      context: context,
      localId: _idFactory('queue'),
      module: 'customers',
      entityType: 'Customer',
      entityId: customerId,
      operationType: SyncOperationType.create,
      payload: payload,
      occurredAt: now,
    );
    await _repository.upsertCustomerAndAppendChange(
      customer: customer,
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(_idFactory('change'), queueItem),
    );
    return customer;
  }

  Future<LocalCustomerProjection> updateCustomer({
    required OfflineInventoryCustomerContext context,
    required String customerId,
    required OfflineCustomerUpdateDraft draft,
  }) async {
    final existing = await _repository.getCustomer(
      tenantId: context.tenantId,
      outletId: context.outletId,
      id: customerId,
    );
    if (existing == null) {
      throw StateError('Offline customer not found.');
    }

    final nextDisplayName = draft.displayName?.trim().isEmpty == true
        ? existing.displayName
        : draft.displayName?.trim() ?? existing.displayName;
    final now = _nowFactory();
    final payload = {
      ...existing.payload,
      'displayName': nextDisplayName,
      'phone': draft.phone == null
          ? existing.phone
          : _normalizedOptional(draft.phone),
      'email': draft.email == null
          ? existing.email
          : _normalizedEmail(draft.email),
      if (draft.customerType != null)
        'customerType': draft.customerType!.wireName,
      if (draft.status != null) 'status': draft.status!.wireName,
      if (draft.notes != null) 'notes': _normalizedOptional(draft.notes),
      'updatedOffline': true,
      'updatedAt': now.toUtc().toIso8601String(),
    };
    final customer = LocalCustomerProjection(
      id: existing.id,
      tenantId: existing.tenantId,
      outletId: existing.outletId,
      deviceId: existing.deviceId,
      displayName: nextDisplayName,
      phone: draft.phone == null
          ? existing.phone
          : _normalizedOptional(draft.phone),
      email: draft.email == null
          ? existing.email
          : _normalizedEmail(draft.email),
      updatedAt: now,
      payload: payload,
      isDirty: true,
    );
    final queueItem = _queueItem(
      context: context,
      localId: _idFactory('queue'),
      module: 'customers',
      entityType: 'Customer',
      entityId: customerId,
      operationType: SyncOperationType.update,
      payload: payload,
      occurredAt: now,
    );
    await _repository.upsertCustomerAndAppendChange(
      customer: customer,
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(_idFactory('change'), queueItem),
    );
    return customer;
  }

  Future<List<LocalInventoryProjection>> lookupInventory({
    required OfflineInventoryCustomerContext context,
    required String query,
  }) {
    return _repository.searchInventoryItems(
      tenantId: context.tenantId,
      outletId: context.outletId,
      query: query,
    );
  }

  Future<LocalInventoryProjection> adjustInventory({
    required OfflineInventoryCustomerContext context,
    required OfflineInventoryAdjustmentDraft draft,
  }) async {
    if (draft.quantityDelta == 0) {
      throw ArgumentError(
        'Offline inventory adjustments require a non-zero quantity delta.',
      );
    }
    final existing = await _repository.getInventoryItem(
      tenantId: context.tenantId,
      outletId: context.outletId,
      id: draft.inventoryItemId,
    );
    if (existing == null) {
      throw StateError('Offline inventory item not found.');
    }

    final now = _nowFactory();
    final transactionType =
        draft.transactionType ??
        (draft.quantityDelta > 0
            ? StockTransactionType.adjustmentIn
            : StockTransactionType.adjustmentOut);
    final nextQuantity = existing.quantity + draft.quantityDelta;
    final adjustmentId = _idFactory('inventory-adjustment');
    final adjustmentPayload = {
      'id': adjustmentId,
      'inventoryItemId': existing.id,
      'sku': existing.sku,
      'name': existing.name,
      'quantityDelta': draft.quantityDelta,
      'previousQuantity': existing.quantity,
      'nextQuantity': nextQuantity,
      'unitCode': existing.unitCode,
      'transactionType': transactionType.wireName,
      'reason': draft.reason.trim(),
      'referenceNumber': _normalizedOptional(draft.referenceNumber),
      'createdOffline': true,
      'createdAt': now.toUtc().toIso8601String(),
    };
    final inventoryPayload = {
      ...existing.payload,
      'quantity': nextQuantity,
      'lastOfflineAdjustment': adjustmentPayload,
      'updatedOffline': true,
      'updatedAt': now.toUtc().toIso8601String(),
    };
    final inventory = LocalInventoryProjection(
      id: existing.id,
      tenantId: existing.tenantId,
      outletId: existing.outletId,
      deviceId: existing.deviceId,
      sku: existing.sku,
      name: existing.name,
      quantity: nextQuantity,
      unitCode: existing.unitCode,
      updatedAt: now,
      payload: inventoryPayload,
      isDirty: true,
    );
    final queueItem = _queueItem(
      context: context,
      localId: _idFactory('queue'),
      module: 'inventory',
      entityType: 'InventoryAdjustment',
      entityId: adjustmentId,
      operationType: SyncOperationType.append,
      payload: adjustmentPayload,
      occurredAt: now,
    );
    await _repository.upsertInventoryAndAppendChange(
      inventory: inventory,
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(_idFactory('change'), queueItem),
    );
    return inventory;
  }

  SyncQueueItem _queueItem({
    required OfflineInventoryCustomerContext context,
    required String localId,
    required String module,
    required String entityType,
    required String entityId,
    required SyncOperationType operationType,
    required Map<String, dynamic> payload,
    required DateTime occurredAt,
  }) => SyncQueueItem(
    localId: localId,
    tenantId: context.tenantId,
    outletId: context.outletId,
    deviceId: context.deviceId,
    actorUserId: context.actorUserId,
    module: module,
    entityType: entityType,
    entityId: entityId,
    operationType: operationType,
    idempotencyKey: '$localId:$entityId:${operationType.wireName}',
    businessDate: context.businessDate,
    occurredAt: occurredAt,
    payload: payload,
    state: SyncQueueState.pending,
    attemptCount: 0,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  );

  LocalChangeLogEntry _changeLogEntry(String id, SyncQueueItem queueItem) =>
      LocalChangeLogEntry(
        id: id,
        queueItemLocalId: queueItem.localId,
        tenantId: queueItem.tenantId,
        outletId: queueItem.outletId,
        deviceId: queueItem.deviceId,
        actorUserId: queueItem.actorUserId,
        module: queueItem.module,
        entityType: queueItem.entityType,
        entityId: queueItem.entityId,
        operationType: queueItem.operationType,
        businessDate: queueItem.businessDate,
        occurredAt: queueItem.occurredAt,
        payload: queueItem.payload,
        createdAt: queueItem.createdAt,
      );
}

String? _normalizedOptional(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  return trimmed;
}

String? _normalizedEmail(String? value) {
  final trimmed = _normalizedOptional(value);
  return trimmed?.toLowerCase();
}

String _customerSourceWireName(CustomerSource source) => switch (source) {
  CustomerSource.pos => 'POS',
  CustomerSource.waiterApp => 'WAITER_APP',
  CustomerSource.qrOrder => 'QR_ORDER',
  CustomerSource.onlineOrder => 'ONLINE_ORDER',
  CustomerSource.customerApp => 'CUSTOMER_APP',
  CustomerSource.import => 'IMPORT',
};

String _defaultIdFactory(String prefix) =>
    '$prefix-${DateTime.now().toUtc().microsecondsSinceEpoch}';
