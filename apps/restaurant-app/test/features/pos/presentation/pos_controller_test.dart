import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_app/features/pos/presentation/controllers/pos_controller.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

void main() {
  const paneer = MenuItem(
    id: 'paneer',
    name: 'Paneer Tikka',
    priceMinor: 28000,
    category: 'Starters',
    emoji: 'PT',
  );
  const naan = MenuItem(
    id: 'naan',
    name: 'Garlic Naan',
    priceMinor: 6000,
    category: 'Breads',
    emoji: 'GN',
  );

  test('filters menu items by category and search query', () {
    final controller = PosController(menuItems: [paneer, naan]);

    controller.selectCategory('Starters');
    expect(controller.filteredItems, [paneer]);

    controller.selectCategory('All');
    controller.updateSearchQuery('naan');
    expect(controller.filteredItems, [naan]);
  });

  test('adds, removes, and orders cart entries by catalog order', () {
    final controller = PosController(menuItems: [paneer, naan]);

    controller
      ..addItem(naan)
      ..addItem(paneer)
      ..addItem(paneer);

    expect(controller.quantityFor(paneer), 2);
    expect(controller.cartEntries.map((entry) => entry.key), [paneer, naan]);

    controller
      ..removeItem(paneer)
      ..removeItem(naan);

    expect(controller.quantityFor(paneer), 1);
    expect(controller.quantityFor(naan), 0);
  });

  test('calculates tax and service charge using integer minor units', () {
    final controller = PosController(menuItems: [paneer, naan])
      ..addItem(paneer)
      ..addItem(paneer)
      ..addItem(naan);

    final totals = controller.totals;

    expect(totals.subtotalMinor, 62000);
    expect(totals.taxMinor, 3100);
    expect(totals.serviceChargeMinor, 1240);
    expect(totals.totalMinor, 66340);
  });
}
