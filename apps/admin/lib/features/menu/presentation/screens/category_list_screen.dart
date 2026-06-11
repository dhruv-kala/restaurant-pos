import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../domain/menu_query.dart';
import '../providers/menu_providers.dart';
import 'category_form_screen.dart';

class CategoryListScreen extends ConsumerStatefulWidget {
  const CategoryListScreen({super.key});

  @override
  ConsumerState<CategoryListScreen> createState() => _CategoryListScreenState();
}

class _CategoryListScreenState extends ConsumerState<CategoryListScreen> {
  String _search = '';
  int _page = 1;

  @override
  Widget build(BuildContext context) {
    final query = MenuQuery(page: _page, search: _search);
    final categories = ref.watch(categoryProvider(query));
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search categories',
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
                label: const Text('Add Category'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: categories.when(
              loading: () => const AppLoading(),
              error: (error, stack) => AppEmptyState(
                title: 'Unable to load categories',
                message: error.toString(),
                icon: Icons.error_outline,
              ),
              data: (response) => response.data.isEmpty
                  ? const AppEmptyState(title: 'No categories found')
                  : ListView.builder(
                      itemCount: response.data.length,
                      itemBuilder: (context, index) {
                        final category = response.data[index];
                        return AppCard(
                          child: ListTile(
                            title: Text(category.name),
                            subtitle: Text(
                              category.description ?? 'No description',
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.edit_outlined),
                              onPressed: () =>
                                  _openForm(context, query, category: category),
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
    MenuCategory? category,
  }) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => CategoryFormScreen(category: category),
      ),
    );
    ref.invalidate(categoryProvider(query));
  }
}
