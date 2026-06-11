import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../domain/menu_query.dart';
import '../providers/menu_providers.dart';
import 'menu_item_form_screen.dart';

class MenuItemListScreen extends ConsumerStatefulWidget {
  const MenuItemListScreen({super.key});

  @override
  ConsumerState<MenuItemListScreen> createState() => _MenuItemListScreenState();
}

class _MenuItemListScreenState extends ConsumerState<MenuItemListScreen> {
  String _search = '';
  int _page = 1;

  @override
  Widget build(BuildContext context) {
    final query = MenuQuery(page: _page, search: _search);
    final items = ref.watch(menuItemsProvider(query));
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search menu items or SKU',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (value) => setState(() {
                    _search = value;
                    _page = 1;
                  }),
                ),
              ),
              const SizedBox(width: 16),
              FilledButton.icon(
                onPressed: () => _openForm(context, query),
                icon: const Icon(Icons.add),
                label: const Text('Add Menu Item'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: items.when(
              loading: () => const AppLoading(),
              error: (error, stack) => AppEmptyState(
                title: 'Unable to load menu items',
                message: error.toString(),
                icon: Icons.error_outline,
              ),
              data: (response) => response.data.isEmpty
                  ? const AppEmptyState(title: 'No menu items found')
                  : ListView.builder(
                      itemCount: response.data.length,
                      itemBuilder: (context, index) {
                        final item = response.data[index];
                        return AppCard(
                          child: ListTile(
                            leading: item.imageUrl == null
                                ? const CircleAvatar(
                                    child: Icon(Icons.restaurant_menu),
                                  )
                                : CircleAvatar(
                                    backgroundImage: NetworkImage(
                                      item.imageUrl!,
                                    ),
                                  ),
                            title: Text(item.name),
                            subtitle: Text(
                              '${item.sku ?? 'No SKU'} | '
                              '${item.priceMinor} minor units | '
                              '${item.isAvailable ? 'Available' : 'Unavailable'}',
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.edit_outlined),
                              onPressed: () =>
                                  _openForm(context, query, item: item),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: <Widget>[
              IconButton(
                onPressed: _page > 1 ? () => setState(() => _page -= 1) : null,
                icon: const Icon(Icons.chevron_left),
              ),
              Text('Page $_page'),
              IconButton(
                onPressed: () => setState(() => _page += 1),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _openForm(
    BuildContext context,
    MenuQuery query, {
    MenuItem? item,
  }) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => MenuItemFormScreen(item: item)),
    );
    ref.invalidate(menuItemsProvider(query));
  }
}
