import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/orders_providers.dart';

final _menuApiProvider = Provider<MenuApiService>(
  (ref) => MenuApiService(ref.watch(dioProvider)),
);
final _tablesApiProvider = Provider<TablesApiService>(
  (ref) => TablesApiService(ref.watch(dioProvider)),
);

class CreateOrderScreen extends ConsumerStatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  ConsumerState<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends ConsumerState<CreateOrderScreen> {
  OrderType _type = OrderType.dineIn;
  String? _tableId;
  String? _customerId;
  final Map<String, int> _quantities = <String, int>{};
  final Map<String, MenuItem> _items = <String, MenuItem>{};
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Order')),
      body: FutureBuilder(
        future: Future.wait([
          ref
              .read(_menuApiProvider)
              .getMenuItems(limit: 100, isAvailable: true),
          ref.read(_tablesApiProvider).getTables(limit: 100),
        ]),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            if (snapshot.hasError) {
              return Center(child: Text('${snapshot.error}'));
            }
            return const Center(child: CircularProgressIndicator());
          }
          final menu = snapshot.data![0] as PaginatedResponse<MenuItem>;
          final tables = snapshot.data![1] as PaginatedResponse<DiningTable>;
          return ListView(
            padding: const EdgeInsets.all(20),
            children: <Widget>[
              DropdownButtonFormField<OrderType>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Order type'),
                items: OrderType.values
                    .map(
                      (type) => DropdownMenuItem(
                        value: type,
                        child: Text(type.wireName),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _type = value!),
              ),
              if (_type == OrderType.dineIn)
                DropdownButtonFormField<String>(
                  initialValue: _tableId,
                  decoration: const InputDecoration(labelText: 'Table'),
                  items: tables.data
                      .where(
                        (table) =>
                            table.status == DiningTableStatus.available ||
                            table.status == DiningTableStatus.reserved,
                      )
                      .map(
                        (table) => DropdownMenuItem(
                          value: table.id,
                          child: Text(table.displayName ?? table.tableNumber),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => _tableId = value,
                ),
              if (_type == OrderType.delivery)
                TextField(
                  decoration: const InputDecoration(labelText: 'Customer ID'),
                  onChanged: (value) => _customerId = value.trim(),
                ),
              const SizedBox(height: 20),
              Text('Menu Items', style: Theme.of(context).textTheme.titleLarge),
              ...menu.data.map((item) {
                final quantity = _quantities[item.id] ?? 0;
                _items[item.id] = item;
                return ListTile(
                  title: Text(item.name),
                  subtitle: Text((item.priceMinor / 100).toStringAsFixed(2)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      IconButton(
                        onPressed: quantity == 0
                            ? null
                            : () => setState(
                                () => _quantities[item.id] = quantity - 1,
                              ),
                        icon: const Icon(Icons.remove),
                      ),
                      Text('$quantity'),
                      IconButton(
                        onPressed: () =>
                            setState(() => _quantities[item.id] = quantity + 1),
                        icon: const Icon(Icons.add),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _saving ? null : _create,
                child: Text(_saving ? 'Creating...' : 'Create Order'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _create() async {
    final selected = _quantities.entries.where((entry) => entry.value > 0);
    if (selected.isEmpty || (_type == OrderType.dineIn && _tableId == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a table and at least one item.')),
      );
      return;
    }
    setState(() => _saving = true);
    await ref.read(ordersRepositoryProvider).create(<String, dynamic>{
      'orderType': _type.wireName,
      if (_tableId != null && _type == OrderType.dineIn) 'tableId': _tableId,
      if (_customerId != null && _type == OrderType.delivery)
        'customerId': _customerId,
      'guestCount': 1,
      'items': selected
          .map(
            (entry) => <String, dynamic>{
              'menuItemId': entry.key,
              'quantity': entry.value,
            },
          )
          .toList(),
    });
    ref.invalidate(activeOrdersProvider);
    if (mounted) Navigator.pop(context);
  }
}
