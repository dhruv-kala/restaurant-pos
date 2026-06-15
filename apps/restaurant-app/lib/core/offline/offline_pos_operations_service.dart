import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import 'offline_local_models.dart';
import 'offline_local_repository.dart';

class OfflinePosContext {
  const OfflinePosContext({
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

class OfflineOrderLineDraft {
  const OfflineOrderLineDraft({
    required this.menuItemId,
    required this.name,
    required this.quantity,
    required this.unitPriceMinor,
    this.notes,
  });

  final String menuItemId;
  final String name;
  final int quantity;
  final int unitPriceMinor;
  final String? notes;

  int get lineTotalMinor => quantity * unitPriceMinor;

  Map<String, dynamic> toJson() => {
    'menuItemId': menuItemId,
    'name': name,
    'quantity': quantity,
    'unitPriceMinor': unitPriceMinor,
    'lineTotalMinor': lineTotalMinor,
    if (notes != null) 'notes': notes,
  };
}

class OfflineOrderDraft {
  const OfflineOrderDraft({
    required this.orderType,
    required this.lines,
    this.tableId,
    this.customerId,
    this.notes,
  });

  final OrderType orderType;
  final List<OfflineOrderLineDraft> lines;
  final String? tableId;
  final String? customerId;
  final String? notes;
}

class OfflineBillDraft {
  const OfflineBillDraft({
    required this.orderId,
    required this.totalMinor,
    required this.currencyCode,
    this.billNumber,
    this.taxMinor = 0,
    this.discountMinor = 0,
  });

  final String orderId;
  final String? billNumber;
  final int totalMinor;
  final int taxMinor;
  final int discountMinor;
  final String currencyCode;
}

class OfflinePaymentDraft {
  const OfflinePaymentDraft({
    required this.billId,
    required this.method,
    required this.amountMinor,
    required this.currencyCode,
    this.referenceNumber,
    this.status = PaymentStatus.success,
  });

  final String billId;
  final PaymentMethod method;
  final int amountMinor;
  final String currencyCode;
  final String? referenceNumber;
  final PaymentStatus status;
}

class OfflineReceiptDraft {
  const OfflineReceiptDraft({
    required this.billId,
    required this.type,
    required this.totalMinor,
    required this.currencyCode,
    this.receiptNumber,
  });

  final String billId;
  final ReceiptType type;
  final String? receiptNumber;
  final int totalMinor;
  final String currencyCode;
}

class OfflinePosOperationsService {
  factory OfflinePosOperationsService({
    required OfflineLocalRepository repository,
    String Function(String prefix)? idFactory,
    DateTime Function()? nowFactory,
  }) => OfflinePosOperationsService._(
    repository,
    idFactory ?? _defaultIdFactory,
    nowFactory ?? (() => DateTime.now().toUtc()),
  );

  OfflinePosOperationsService._(
    this._repository,
    this._idFactory,
    this._nowFactory,
  );

  final OfflineLocalRepository _repository;
  final String Function(String prefix) _idFactory;
  final DateTime Function() _nowFactory;

  Future<LocalOrderProjection> createOrder({
    required OfflinePosContext context,
    required OfflineOrderDraft draft,
  }) async {
    if (draft.lines.isEmpty) {
      throw ArgumentError('Offline orders require at least one line.');
    }

    final now = _nowFactory();
    final orderId = _idFactory('order');
    final payload = {
      'id': orderId,
      'orderType': draft.orderType.wireName,
      'status': OrderStatus.pending.wireName,
      'tableId': draft.tableId,
      'customerId': draft.customerId,
      'notes': draft.notes,
      'items': draft.lines.map((line) => line.toJson()).toList(),
      'subtotalMinor': draft.lines.fold<int>(
        0,
        (total, line) => total + line.lineTotalMinor,
      ),
      'createdOffline': true,
      'createdAt': now.toUtc().toIso8601String(),
    };
    final order = LocalOrderProjection(
      id: orderId,
      tenantId: context.tenantId,
      outletId: context.outletId,
      deviceId: context.deviceId,
      businessDate: context.businessDate,
      status: OrderStatus.pending.wireName,
      updatedAt: now,
      payload: payload,
      isDirty: true,
    );
    final queueItem = _queueItem(
      context: context,
      localId: _idFactory('queue'),
      module: 'orders',
      entityType: 'Order',
      entityId: orderId,
      operationType: SyncOperationType.create,
      payload: payload,
      occurredAt: now,
    );
    await _repository.upsertOrderAndAppendChange(
      order: order,
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(_idFactory('change'), queueItem),
    );
    return order;
  }

  Future<LocalOrderProjection> updateOrderStatus({
    required OfflinePosContext context,
    required String orderId,
    required OrderStatus status,
  }) async {
    final existing = await _repository.getOrder(
      tenantId: context.tenantId,
      outletId: context.outletId,
      id: orderId,
    );
    if (existing == null) {
      throw StateError('Offline order not found.');
    }

    final now = _nowFactory();
    final payload = {
      ...existing.payload,
      'status': status.wireName,
      'statusUpdatedOffline': true,
      'updatedAt': now.toUtc().toIso8601String(),
    };
    final order = LocalOrderProjection(
      id: existing.id,
      tenantId: existing.tenantId,
      outletId: existing.outletId,
      deviceId: existing.deviceId,
      businessDate: existing.businessDate,
      orderNumber: existing.orderNumber,
      status: status.wireName,
      updatedAt: now,
      payload: payload,
      isDirty: true,
    );
    final queueItem = _queueItem(
      context: context,
      localId: _idFactory('queue'),
      module: 'orders',
      entityType: 'Order',
      entityId: orderId,
      operationType: SyncOperationType.lifecycle,
      payload: payload,
      occurredAt: now,
    );
    await _repository.upsertOrderAndAppendChange(
      order: order,
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(_idFactory('change'), queueItem),
    );
    return order;
  }

  Future<LocalBillProjection> generateBill({
    required OfflinePosContext context,
    required OfflineBillDraft draft,
  }) async {
    final now = _nowFactory();
    final billId = _idFactory('bill');
    final payload = {
      'id': billId,
      'orderId': draft.orderId,
      'billNumber': draft.billNumber,
      'status': BillStatus.generated.wireName,
      'paymentStatus': BillPaymentStatus.unpaid.wireName,
      'totalMinor': draft.totalMinor,
      'taxMinor': draft.taxMinor,
      'discountMinor': draft.discountMinor,
      'currencyCode': draft.currencyCode,
      'createdOffline': true,
      'createdAt': now.toUtc().toIso8601String(),
    };
    final bill = LocalBillProjection(
      id: billId,
      tenantId: context.tenantId,
      outletId: context.outletId,
      deviceId: context.deviceId,
      businessDate: context.businessDate,
      orderId: draft.orderId,
      billNumber: draft.billNumber,
      status: BillStatus.generated.wireName,
      totalMinor: draft.totalMinor,
      currencyCode: draft.currencyCode,
      updatedAt: now,
      payload: payload,
      isDirty: true,
    );
    final queueItem = _queueItem(
      context: context,
      localId: _idFactory('queue'),
      module: 'billing',
      entityType: 'Bill',
      entityId: billId,
      operationType: SyncOperationType.create,
      payload: payload,
      occurredAt: now,
    );
    await _repository.upsertBillAndAppendChange(
      bill: bill,
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(_idFactory('change'), queueItem),
    );
    return bill;
  }

  Future<LocalPaymentProjection> recordPayment({
    required OfflinePosContext context,
    required OfflinePaymentDraft draft,
  }) async {
    final bill = await _repository.getBill(
      tenantId: context.tenantId,
      outletId: context.outletId,
      id: draft.billId,
    );
    if (bill == null) {
      throw StateError('Offline bill not found.');
    }

    final now = _nowFactory();
    final paymentId = _idFactory('payment');
    final payload = {
      'id': paymentId,
      'billId': draft.billId,
      'method': draft.method.wireName,
      'status': draft.status.wireName,
      'amountMinor': draft.amountMinor,
      'currencyCode': draft.currencyCode,
      'referenceNumber': draft.referenceNumber,
      'verificationMode': OfflinePaymentVerificationMode.manual.wireName,
      'verificationStatus': draft.status == PaymentStatus.success
          ? OfflinePaymentVerificationStatus.verified.wireName
          : OfflinePaymentVerificationStatus.pending.wireName,
      'createdOffline': true,
      'createdAt': now.toUtc().toIso8601String(),
    };
    final payment = LocalPaymentProjection(
      id: paymentId,
      tenantId: context.tenantId,
      outletId: context.outletId,
      deviceId: context.deviceId,
      businessDate: context.businessDate,
      billId: draft.billId,
      method: draft.method.wireName,
      status: draft.status.wireName,
      amountMinor: draft.amountMinor,
      currencyCode: draft.currencyCode,
      referenceNumber: draft.referenceNumber,
      updatedAt: now,
      payload: payload,
      isDirty: true,
    );
    final paidMinor = await _paidAmountForBill(context, draft.billId);
    final totalPaidMinor = paidMinor + draft.amountMinor;
    final billPayload = {
      ...bill.payload,
      'paidMinor': totalPaidMinor,
      'paymentStatus': totalPaidMinor >= bill.totalMinor
          ? BillPaymentStatus.paid.wireName
          : BillPaymentStatus.partiallyPaid.wireName,
      'updatedOffline': true,
      'updatedAt': now.toUtc().toIso8601String(),
    };
    final updatedBill = LocalBillProjection(
      id: bill.id,
      tenantId: bill.tenantId,
      outletId: bill.outletId,
      deviceId: bill.deviceId,
      businessDate: bill.businessDate,
      orderId: bill.orderId,
      billNumber: bill.billNumber,
      status: totalPaidMinor >= bill.totalMinor
          ? BillStatus.paid.wireName
          : bill.status,
      totalMinor: bill.totalMinor,
      currencyCode: bill.currencyCode,
      updatedAt: now,
      payload: billPayload,
      isDirty: true,
    );
    final queueItem = _queueItem(
      context: context,
      localId: _idFactory('queue'),
      module: 'payments',
      entityType: 'Payment',
      entityId: paymentId,
      operationType: SyncOperationType.append,
      payload: payload,
      occurredAt: now,
    );
    await _repository.upsertPaymentAndAppendChange(
      payment: payment,
      updatedBill: updatedBill,
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(_idFactory('change'), queueItem),
    );
    return payment;
  }

  Future<LocalReceiptProjection> generateReceipt({
    required OfflinePosContext context,
    required OfflineReceiptDraft draft,
  }) async {
    final bill = await _repository.getBill(
      tenantId: context.tenantId,
      outletId: context.outletId,
      id: draft.billId,
    );
    if (bill == null) {
      throw StateError('Offline bill not found.');
    }

    final now = _nowFactory();
    final receiptId = _idFactory('receipt');
    final payload = {
      'id': receiptId,
      'billId': draft.billId,
      'receiptNumber': draft.receiptNumber,
      'type': draft.type.wireName,
      'status': ReceiptStatus.generated.wireName,
      'totalMinor': draft.totalMinor,
      'currencyCode': draft.currencyCode,
      'createdOffline': true,
      'createdAt': now.toUtc().toIso8601String(),
    };
    final receipt = LocalReceiptProjection(
      id: receiptId,
      tenantId: context.tenantId,
      outletId: context.outletId,
      deviceId: context.deviceId,
      businessDate: context.businessDate,
      billId: draft.billId,
      receiptNumber: draft.receiptNumber,
      type: draft.type.wireName,
      status: ReceiptStatus.generated.wireName,
      totalMinor: draft.totalMinor,
      currencyCode: draft.currencyCode,
      updatedAt: now,
      payload: payload,
      isDirty: true,
    );
    final queueItem = _queueItem(
      context: context,
      localId: _idFactory('queue'),
      module: 'receipts',
      entityType: 'Receipt',
      entityId: receiptId,
      operationType: SyncOperationType.create,
      payload: payload,
      occurredAt: now,
    );
    await _repository.upsertReceiptAndAppendChange(
      receipt: receipt,
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(_idFactory('change'), queueItem),
    );
    return receipt;
  }

  Future<int> _paidAmountForBill(
    OfflinePosContext context,
    String billId,
  ) async {
    final payments = await _repository.listPayments(
      tenantId: context.tenantId,
      outletId: context.outletId,
      billId: billId,
    );
    return payments
        .where((payment) => payment.status == PaymentStatus.success.wireName)
        .fold<int>(0, (total, payment) => total + payment.amountMinor);
  }

  SyncQueueItem _queueItem({
    required OfflinePosContext context,
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

String _defaultIdFactory(String prefix) =>
    '$prefix-${DateTime.now().toUtc().microsecondsSinceEpoch}';
