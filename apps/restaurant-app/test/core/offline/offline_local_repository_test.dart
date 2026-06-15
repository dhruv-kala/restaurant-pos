import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_app/core/offline/local_database.dart';
import 'package:restaurant_app/core/offline/offline_local_models.dart';
import 'package:restaurant_app/core/offline/offline_local_repository.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);

  test('persists scoped offline projections across database reopen', () async {
    final directory = await Directory.systemTemp.createTemp(
      'restaurant-pos-offline-',
    );
    final databasePath = '${directory.path}/offline.db';
    final timestamp = DateTime.utc(2026, 6, 15, 9);
    final businessDate = DateTime.utc(2026, 6, 15);

    final database = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final repository = OfflineLocalRepository(database);

    await repository.upsertDeviceSyncState(
      DeviceSyncState(
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        userId: 'user-1',
        trustedSessionId: 'session-1',
        syncEnabled: true,
        isOnline: false,
        lastPullCursor: 'cursor-1',
        pendingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        updatedAt: timestamp,
      ),
    );
    await repository.upsertOrder(
      LocalOrderProjection(
        id: 'order-local-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        businessDate: businessDate,
        orderNumber: 'O-1',
        status: 'OPEN',
        updatedAt: timestamp,
        payload: const {'tableId': 'table-1'},
      ),
    );
    await repository.upsertBill(
      LocalBillProjection(
        id: 'bill-local-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        businessDate: businessDate,
        orderId: 'order-local-1',
        billNumber: 'B-1',
        status: 'DRAFT',
        totalMinor: 125000,
        currencyCode: 'INR',
        updatedAt: timestamp,
        payload: const {'lineCount': 2},
      ),
    );
    await repository.upsertCustomer(
      LocalCustomerProjection(
        id: 'customer-local-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        displayName: 'Asha Patel',
        phone: '+919999999999',
        updatedAt: timestamp,
        payload: const {'loyaltyTier': 'GOLD'},
      ),
    );
    await repository.upsertInventory(
      LocalInventoryProjection(
        id: 'inventory-local-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        sku: 'RICE-01',
        name: 'Rice',
        quantity: 12.5,
        unitCode: 'KG',
        updatedAt: timestamp,
        payload: const {'batchTracked': true},
      ),
    );

    await database.close();

    final reopenedDatabase = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final reopenedRepository = OfflineLocalRepository(reopenedDatabase);

    final syncState = await reopenedRepository.getDeviceSyncState(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
    );
    final order = await reopenedRepository.getOrder(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      id: 'order-local-1',
    );
    final bill = await reopenedRepository.getBill(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      id: 'bill-local-1',
    );
    final customer = await reopenedRepository.getCustomer(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      id: 'customer-local-1',
    );
    final inventory = await reopenedRepository.getInventoryItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      id: 'inventory-local-1',
    );

    expect(syncState?.lastPullCursor, 'cursor-1');
    expect(order?.payload['tableId'], 'table-1');
    expect(bill?.totalMinor, 125000);
    expect(customer?.phone, '+919999999999');
    expect(inventory?.quantity, 12.5);

    final otherTenantOrders = await reopenedRepository.listOrders(
      tenantId: 'tenant-2',
      outletId: 'outlet-1',
      businessDate: businessDate,
    );
    expect(otherTenantOrders, isEmpty);

    await reopenedDatabase.close();
    await directory.delete(recursive: true);
  });
}
