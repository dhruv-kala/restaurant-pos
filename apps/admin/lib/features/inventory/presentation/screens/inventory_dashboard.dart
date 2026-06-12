import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/inventory_query.dart';
import '../providers/inventory_providers.dart';
import 'ingredient_list_screen.dart';
import 'inventory_alerts_screen.dart';
import 'inventory_valuation_screen.dart';
import 'purchase_order_screen.dart';
import 'stock_adjustment_screen.dart';
import 'stock_transfer_screen.dart';
import 'vendor_management_screen.dart';

class InventoryDashboard extends ConsumerWidget {
  const InventoryDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = InventoryQuery();
    final ingredients = ref.watch(ingredientProvider(query));
    final stocks = ref.watch(stockProvider(query));
    final alerts = ref.watch(alertsProvider(query));
    final orders = ref.watch(purchaseOrdersProvider(query));
    final valuation = ref.watch(inventoryValuationProvider(query));
    final low =
        alerts.value?.data
            .where((item) => item.alertType.name == 'lowStock')
            .length ??
        0;
    final out =
        alerts.value?.data
            .where((item) => item.alertType.name == 'outOfStock')
            .length ??
        0;
    final pending =
        orders.value?.data
            .where((item) => item.status.name == 'pending')
            .length ??
        0;
    return Scaffold(
      appBar: AppBar(title: const Text('Inventory')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _Metric('Ingredients', '${ingredients.value?.meta.total ?? 0}'),
              _Metric(
                'Stock Value',
                '${valuation.value?.totalInventoryValue ?? 0}',
              ),
              _Metric('Low Stock', '$low'),
              _Metric('Out of Stock', '$out'),
              _Metric('Pending POs', '$pending'),
              _Metric('Stock Rows', '${stocks.value?.meta.total ?? 0}'),
            ],
          ),
          const SizedBox(height: 24),
          for (final action in <(String, IconData, Widget)>[
            ('Ingredients', Icons.inventory_2, const IngredientListScreen()),
            ('Adjust Stock', Icons.tune, const StockAdjustmentScreen()),
            ('Transfer Stock', Icons.swap_horiz, const StockTransferScreen()),
            ('Vendors', Icons.local_shipping, const VendorManagementScreen()),
            (
              'Purchase Orders',
              Icons.receipt_long,
              const PurchaseOrderScreen(),
            ),
            ('Alerts', Icons.warning_amber, const InventoryAlertsScreen()),
            (
              'Valuation',
              Icons.account_balance,
              const InventoryValuationScreen(),
            ),
          ])
            ListTile(
              leading: Icon(action.$2),
              title: Text(action.$1),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(
                context,
              ).push(MaterialPageRoute<void>(builder: (_) => action.$3)),
            ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Card(
    child: SizedBox(
      width: 150,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(value, style: Theme.of(context).textTheme.headlineSmall),
            Text(label),
          ],
        ),
      ),
    ),
  );
}
