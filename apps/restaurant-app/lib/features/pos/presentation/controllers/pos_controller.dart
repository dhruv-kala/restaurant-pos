import 'package:flutter/foundation.dart';
import 'package:serveiq_shared_models/serveiq_shared_models.dart';

import '../../domain/entities/cart_totals.dart';

class PosController extends ChangeNotifier {
  PosController({
    required List<MenuItem> menuItems,
    this.taxRateBasisPoints = 500,
    this.serviceChargeBasisPoints = 200,
  }) : _menuItems = List.unmodifiable(menuItems);

  final List<MenuItem> _menuItems;
  final int taxRateBasisPoints;
  final int serviceChargeBasisPoints;
  final Map<String, int> _quantities = {};

  String _selectedCategory = 'All';
  String _searchQuery = '';

  String get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;
  bool get isCartEmpty => _quantities.isEmpty;

  List<String> get categories {
    return ['All', ..._menuItems.map((item) => item.category).toSet()];
  }

  List<MenuItem> get filteredItems {
    final normalizedQuery = _searchQuery.trim().toLowerCase();

    return _menuItems
        .where((item) {
          final matchesCategory =
              _selectedCategory == 'All' || item.category == _selectedCategory;
          final matchesSearch =
              normalizedQuery.isEmpty ||
              item.name.toLowerCase().contains(normalizedQuery);
          return matchesCategory && matchesSearch;
        })
        .toList(growable: false);
  }

  Iterable<MapEntry<MenuItem, int>> get cartEntries sync* {
    for (final item in _menuItems) {
      final quantity = _quantities[item.id];
      if (quantity != null) {
        yield MapEntry(item, quantity);
      }
    }
  }

  CartTotals get totals {
    final subtotalMinor = cartEntries.fold(
      0,
      (sum, entry) => sum + (entry.key.priceMinor * entry.value),
    );

    return CartTotals(
      subtotalMinor: subtotalMinor,
      taxMinor: _percentageOf(subtotalMinor, taxRateBasisPoints),
      serviceChargeMinor: _percentageOf(
        subtotalMinor,
        serviceChargeBasisPoints,
      ),
    );
  }

  int quantityFor(MenuItem item) => _quantities[item.id] ?? 0;

  void selectCategory(String category) {
    if (_selectedCategory == category) {
      return;
    }
    _selectedCategory = category;
    notifyListeners();
  }

  void updateSearchQuery(String query) {
    if (_searchQuery == query) {
      return;
    }
    _searchQuery = query;
    notifyListeners();
  }

  void addItem(MenuItem item) {
    _quantities.update(item.id, (quantity) => quantity + 1, ifAbsent: () => 1);
    notifyListeners();
  }

  void removeItem(MenuItem item) {
    final quantity = _quantities[item.id];
    if (quantity == null) {
      return;
    }

    if (quantity == 1) {
      _quantities.remove(item.id);
    } else {
      _quantities[item.id] = quantity - 1;
    }
    notifyListeners();
  }

  int _percentageOf(int amountMinor, int basisPoints) {
    return ((amountMinor * basisPoints) + 5000) ~/ 10000;
  }
}
