import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_app/core/offline/local_database.dart';
import 'package:restaurant_app/core/offline/offline_inventory_customer_operations_service.dart';
import 'package:restaurant_app/core/offline/offline_local_models.dart';
import 'package:restaurant_app/core/offline/offline_local_repository.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);

  test('creates, updates, and looks up offline customers', () async {
    final directory = await Directory.systemTemp.createTemp(
      'restaurant-pos-offline-customers-',
    );
    final databasePath = '${directory.path}/offline.db';
    final now = DateTime.utc(2026, 6, 15, 16);
    var sequence = 0;

    final database = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final repository = OfflineLocalRepository(database);
    final service = OfflineInventoryCustomerOperationsService(
      repository: repository,
      nowFactory: () => now.add(Duration(minutes: sequence++)),
      idFactory: (prefix) => '$prefix-$sequence',
    );
    final context = _context();

    final customer = await service.createCustomer(
      context: context,
      draft: const OfflineCustomerDraft(
        displayName: '  Asha Patel  ',
        phone: '+919999999999',
        email: 'ASHA@EXAMPLE.COM',
        customerType: CustomerType.regular,
      ),
    );
    final updated = await service.updateCustomer(
      context: context,
      customerId: customer.id,
      draft: const OfflineCustomerUpdateDraft(
        displayName: 'Asha P.',
        notes: 'Prefers window seating.',
      ),
    );
    final phoneMatches = await service.lookupCustomers(
      context: context,
      query: '9999',
    );
    final nameMatches = await service.lookupCustomers(
      context: context,
      query: 'asha p',
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
      entityType: 'Customer',
      entityId: customer.id,
    );

    expect(customer.displayName, 'Asha Patel');
    expect(customer.email, 'asha@example.com');
    expect(updated.displayName, 'Asha P.');
    expect(updated.payload['notes'], 'Prefers window seating.');
    expect(phoneMatches.single.id, customer.id);
    expect(nameMatches.single.id, customer.id);
    expect(
      queue.map(
        (item) =>
            '${item.module}:${item.entityType}:${item.operationType.wireName}',
      ),
      ['customers:Customer:CREATE', 'customers:Customer:UPDATE'],
    );
    expect(changes.length, 2);

    final otherTenantMatches = await repository.searchCustomers(
      tenantId: 'tenant-2',
      outletId: context.outletId,
      query: 'asha',
    );
    expect(otherTenantMatches, isEmpty);

    await database.close();
    await directory.delete(recursive: true);
  });

  test('looks up and adjusts offline inventory', () async {
    final directory = await Directory.systemTemp.createTemp(
      'restaurant-pos-offline-inventory-',
    );
    final databasePath = '${directory.path}/offline.db';
    final now = DateTime.utc(2026, 6, 15, 17);
    var sequence = 0;

    final database = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final repository = OfflineLocalRepository(database);
    final service = OfflineInventoryCustomerOperationsService(
      repository: repository,
      nowFactory: () => now.add(Duration(minutes: sequence++)),
      idFactory: (prefix) => '$prefix-$sequence',
    );
    final context = _context();

    await repository.upsertInventory(
      LocalInventoryProjection(
        id: 'inventory-rice',
        tenantId: context.tenantId,
        outletId: context.outletId,
        deviceId: context.deviceId,
        sku: 'RICE-01',
        name: 'Rice',
        quantity: 12.5,
        unitCode: 'KG',
        updatedAt: now,
        payload: const {'batchTracked': true, 'quantity': 12.5},
      ),
    );

    final lookup = await service.lookupInventory(
      context: context,
      query: 'rice',
    );
    final adjusted = await service.adjustInventory(
      context: context,
      draft: const OfflineInventoryAdjustmentDraft(
        inventoryItemId: 'inventory-rice',
        quantityDelta: -2.25,
        reason: 'Manual stock count correction',
        referenceNumber: 'COUNT-1',
      ),
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
      entityType: 'InventoryAdjustment',
    );

    expect(lookup.single.id, 'inventory-rice');
    expect(adjusted.quantity, 10.25);
    expect(
      adjusted.payload['lastOfflineAdjustment']['transactionType'],
      StockTransactionType.adjustmentOut.wireName,
    );
    expect(queue.single.operationType, SyncOperationType.append);
    expect(queue.single.module, 'inventory');
    expect(queue.single.entityType, 'InventoryAdjustment');
    expect(changes.single.entityId, queue.single.entityId);

    await expectLater(
      service.adjustInventory(
        context: context,
        draft: const OfflineInventoryAdjustmentDraft(
          inventoryItemId: 'missing-item',
          quantityDelta: 1,
          reason: 'Missing item',
        ),
      ),
      throwsA(isA<StateError>()),
    );

    await expectLater(
      service.adjustInventory(
        context: context,
        draft: const OfflineInventoryAdjustmentDraft(
          inventoryItemId: 'inventory-rice',
          quantityDelta: 0,
          reason: 'No-op',
        ),
      ),
      throwsA(isA<ArgumentError>()),
    );

    await database.close();
    await directory.delete(recursive: true);
  });
}

OfflineInventoryCustomerContext _context() => OfflineInventoryCustomerContext(
  tenantId: 'tenant-1',
  outletId: 'outlet-1',
  deviceId: 'device-1',
  actorUserId: 'user-1',
  businessDate: DateTime.utc(2026, 6, 15),
);
