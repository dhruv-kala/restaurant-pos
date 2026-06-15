import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_app/core/offline/local_database.dart';
import 'package:restaurant_app/core/offline/offline_local_repository.dart';
import 'package:restaurant_app/core/offline/offline_pos_operations_service.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);

  test(
    'runs an offline POS order, bill, payment, and receipt workflow',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'restaurant-pos-offline-pos-',
      );
      final databasePath = '${directory.path}/offline.db';
      final now = DateTime.utc(2026, 6, 15, 14);
      var sequence = 0;

      final database = OfflineLocalDatabase(
        databaseFactory: databaseFactoryFfi,
        databasePath: databasePath,
      );
      final repository = OfflineLocalRepository(database);
      final service = OfflinePosOperationsService(
        repository: repository,
        nowFactory: () => now.add(Duration(minutes: sequence++)),
        idFactory: (prefix) => '$prefix-$sequence',
      );
      final context = OfflinePosContext(
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        actorUserId: 'cashier-1',
        businessDate: DateTime.utc(2026, 6, 15),
      );

      final order = await service.createOrder(
        context: context,
        draft: const OfflineOrderDraft(
          orderType: OrderType.dineIn,
          tableId: 'table-1',
          lines: [
            OfflineOrderLineDraft(
              menuItemId: 'menu-1',
              name: 'Masala Dosa',
              quantity: 2,
              unitPriceMinor: 12000,
            ),
          ],
        ),
      );
      final served = await service.updateOrderStatus(
        context: context,
        orderId: order.id,
        status: OrderStatus.served,
      );
      final bill = await service.generateBill(
        context: context,
        draft: OfflineBillDraft(
          orderId: order.id,
          billNumber: 'OFF-BILL-1',
          totalMinor: 24000,
          currencyCode: 'INR',
        ),
      );
      final payment = await service.recordPayment(
        context: context,
        draft: OfflinePaymentDraft(
          billId: bill.id,
          method: PaymentMethod.cash,
          amountMinor: 24000,
          currencyCode: 'INR',
        ),
      );
      final receipt = await service.generateReceipt(
        context: context,
        draft: OfflineReceiptDraft(
          billId: bill.id,
          type: ReceiptType.customerReceipt,
          receiptNumber: 'OFF-REC-1',
          totalMinor: 24000,
          currencyCode: 'INR',
        ),
      );

      final storedBill = await repository.getBill(
        tenantId: context.tenantId,
        outletId: context.outletId,
        id: bill.id,
      );
      final queue = await repository.listSyncQueueItems(
        tenantId: context.tenantId,
        outletId: context.outletId,
        deviceId: context.deviceId,
      );
      final changes = await repository.listLocalChanges(
        tenantId: context.tenantId,
        outletId: context.outletId,
        deviceId: context.deviceId,
      );

      expect(order.status, OrderStatus.pending.wireName);
      expect(served.status, OrderStatus.served.wireName);
      expect(payment.status, PaymentStatus.success.wireName);
      expect(receipt.status, ReceiptStatus.generated.wireName);
      expect(storedBill?.status, BillStatus.paid.wireName);
      expect(
        storedBill?.payload['paymentStatus'],
        BillPaymentStatus.paid.wireName,
      );
      expect(
        queue.map(
          (item) =>
              '${item.module}:${item.entityType}:${item.operationType.wireName}',
        ),
        [
          'orders:Order:CREATE',
          'orders:Order:LIFECYCLE',
          'billing:Bill:CREATE',
          'payments:Payment:APPEND',
          'receipts:Receipt:CREATE',
        ],
      );
      expect(changes.length, 5);

      await database.close();
      await directory.delete(recursive: true);
    },
  );

  test(
    'rejects offline financial operations without local prerequisites',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'restaurant-pos-offline-pos-missing-',
      );
      final database = OfflineLocalDatabase(
        databaseFactory: databaseFactoryFfi,
        databasePath: '${directory.path}/offline.db',
      );
      final service = OfflinePosOperationsService(
        repository: OfflineLocalRepository(database),
        nowFactory: () => DateTime.utc(2026, 6, 15, 15),
        idFactory: (prefix) => '$prefix-id',
      );
      final context = OfflinePosContext(
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        actorUserId: 'cashier-1',
        businessDate: DateTime.utc(2026, 6, 15),
      );

      await expectLater(
        service.recordPayment(
          context: context,
          draft: const OfflinePaymentDraft(
            billId: 'missing-bill',
            method: PaymentMethod.cash,
            amountMinor: 1000,
            currencyCode: 'INR',
          ),
        ),
        throwsA(isA<StateError>()),
      );

      await database.close();
      await directory.delete(recursive: true);
    },
  );
}
