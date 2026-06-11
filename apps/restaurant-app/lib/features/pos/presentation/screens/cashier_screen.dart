import 'package:flutter/material.dart';
import 'package:restaurant_pos_core/restaurant_pos_core.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../data/demo_menu_catalog.dart';
import '../controllers/pos_controller.dart';

// ─────────────────────────────────────────────
//  SERVEIQ – Cashier POS Screen
//  Pure-veg menu · Cart · Billing · Payment
// ─────────────────────────────────────────────

class CashierScreen extends StatefulWidget {
  const CashierScreen({super.key});

  @override
  State<CashierScreen> createState() => _CashierScreenState();
}

class _CashierScreenState extends State<CashierScreen> {
  int _selectedNav = 1; // POS is index 1
  late final PosController _posController;

  // ── Colours ──────────────────────────────────
  static const Color _amber = Color(0xFFE8960C);
  static const Color _amberLight = Color(0xFFFFF3DC);
  static const Color _green = Color(0xFF1D9E75);
  static const Color _greenLight = Color(0xFFE1F5EE);
  static const Color _blue = Color(0xFF185FA5);
  static const Color _blueLight = Color(0xFFE6F1FB);
  static const Color _surface = Color(0xFFF8F9FC);
  static const Color _border = Color(0xFFEAECF2);
  static const Color _textPrimary = Color(0xFF1A2035);
  static const Color _textSecondary = Color(0xFF6B7280);

  @override
  void initState() {
    super.initState();
    _posController = PosController(menuItems: demoMenuCatalog)
      ..addListener(_rebuild);
  }

  @override
  void dispose() {
    _posController
      ..removeListener(_rebuild)
      ..dispose();
    super.dispose();
  }

  void _rebuild() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _surface,
      body: Row(
        children: [
          AppSidebar(
            items: defaultAppNavigationItems,
            selectedIndex: _selectedNav,
            onItemSelected: (i) => setState(() => _selectedNav = i),
          ),
          Expanded(
            child: Column(
              children: [
                _buildTopBar(),
                Expanded(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Menu side ───────────────────────────
                      Expanded(
                        child: Column(
                          children: [
                            _buildCategoryBar(),
                            _buildSearchBar(),
                            Expanded(child: _buildMenuGrid()),
                          ],
                        ),
                      ),
                      // ── Bill side ───────────────────────────
                      _buildBillPanel(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFEAECF2), width: 0.5),
        ),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Cashier POS',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: _textPrimary,
                ),
              ),
              Text(
                'Table 7 · Dine-in · 3 guests',
                style: const TextStyle(fontSize: 12, color: _textSecondary),
              ),
            ],
          ),
          const Spacer(),
          _Badge('Order #148', _blue, _blueLight),
          const SizedBox(width: 12),
          CircleAvatar(
            radius: 17,
            backgroundColor: _blueLight,
            child: const Text(
              'RK',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _blue,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryBar() {
    return Container(
      height: 52,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _posController.categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final cat = _posController.categories[i];
          final active = cat == _posController.selectedCategory;
          return Center(
            child: InkWell(
              onTap: () => _posController.selectCategory(cat),
              borderRadius: BorderRadius.circular(20),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: active ? _amber : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: active ? _amber : _border,
                    width: 0.5,
                  ),
                ),
                child: Text(
                  cat,
                  style: TextStyle(
                    fontSize: 13,
                    color: active ? Colors.white : _textSecondary,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: Container(
        height: 42,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: _border, width: 0.5),
        ),
        child: Row(
          children: [
            const SizedBox(width: 12),
            const Icon(Icons.search_rounded, size: 18, color: _textSecondary),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                onChanged: _posController.updateSearchQuery,
                style: const TextStyle(fontSize: 13, color: _textPrimary),
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: 'Search menu items...',
                  hintStyle: TextStyle(fontSize: 13, color: _textSecondary),
                  isDense: true,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuGrid() {
    final items = _posController.filteredItems;
    return GridView.builder(
      padding: const EdgeInsets.all(20),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 160,
        childAspectRatio: 0.85,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final item = items[i];
        final quantity = _posController.quantityFor(item);
        final inCart = quantity > 0;
        return InkWell(
          onTap: () => _posController.addItem(item),
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            decoration: BoxDecoration(
              color: inCart ? _greenLight : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: inCart ? const Color(0xFF5DCAA5) : _border,
                width: inCart ? 1.5 : 0.5,
              ),
            ),
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(item.emoji, style: const TextStyle(fontSize: 28)),
                const SizedBox(height: 8),
                Text(
                  item.name,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: _textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  CurrencyFormatter.inr(item.priceMinor),
                  style: TextStyle(
                    fontSize: 12,
                    color: inCart ? _green : _amber,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (inCart) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: _green,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$quantity x added',
                      style: const TextStyle(fontSize: 10, color: Colors.white),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBillPanel() {
    return Container(
      width: 300,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(left: BorderSide(color: Color(0xFFEAECF2), width: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(18),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFFEAECF2), width: 0.5),
              ),
            ),
            child: Row(
              children: [
                const Text(
                  'Current Order',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: _textPrimary,
                  ),
                ),
                const Spacer(),
                _Badge('Table 7', _amber, _amberLight),
              ],
            ),
          ),

          // Cart items
          Expanded(
            child: _posController.isCartEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(
                          Icons.shopping_cart_outlined,
                          size: 40,
                          color: Color(0xFFD1D5DB),
                        ),
                        SizedBox(height: 10),
                        Text(
                          'No items added',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    children: _posController.cartEntries
                        .map(
                          (e) => _CartRow(
                            item: e.key,
                            qty: e.value,
                            onAdd: () => _posController.addItem(e.key),
                            onRemove: () => _posController.removeItem(e.key),
                          ),
                        )
                        .toList(),
                  ),
          ),

          // Totals
          if (!_posController.isCartEmpty)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(color: Color(0xFFEAECF2), width: 0.5),
                ),
              ),
              child: Column(
                children: [
                  _TotalRow(
                    'Subtotal',
                    CurrencyFormatter.inr(_posController.totals.subtotalMinor),
                  ),
                  const SizedBox(height: 6),
                  _TotalRow(
                    'GST (5%)',
                    CurrencyFormatter.inr(_posController.totals.taxMinor),
                  ),
                  const SizedBox(height: 6),
                  _TotalRow(
                    'Service (2%)',
                    CurrencyFormatter.inr(
                      _posController.totals.serviceChargeMinor,
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 0.5, color: Color(0xFFEAECF2)),
                  ),
                  Row(
                    children: [
                      const Text(
                        'Total',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: _textPrimary,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        CurrencyFormatter.inr(_posController.totals.totalMinor),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: _textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _OutlineBtn(
                          icon: Icons.print_rounded,
                          label: 'Print KOT',
                          onTap: () {},
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _OutlineBtn(
                          icon: Icons.discount_rounded,
                          label: 'Discount',
                          onTap: () {},
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.credit_card_rounded, size: 18),
                      label: const Text('Proceed to Pay'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        textStyle: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  CART ROW
// ─────────────────────────────────────────────
class _CartRow extends StatelessWidget {
  final MenuItem item;
  final int qty;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  const _CartRow({
    required this.item,
    required this.qty,
    required this.onAdd,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
      child: Row(
        children: [
          Text(item.emoji, style: const TextStyle(fontSize: 18)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF1A2035),
                  ),
                ),
                Text(
                  '${CurrencyFormatter.inr(item.priceMinor)} each',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              _QtyBtn(icon: Icons.remove, onTap: onRemove),
              SizedBox(
                width: 26,
                child: Text(
                  '$qty',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              _QtyBtn(icon: Icons.add, onTap: onAdd),
            ],
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 50,
            child: Text(
              CurrencyFormatter.inr(item.priceMinor * qty),
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1A2035),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _QtyBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Container(
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          color: const Color(0xFFF8F9FC),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: const Color(0xFFEAECF2), width: 0.5),
        ),
        child: Icon(icon, size: 14, color: const Color(0xFF1A2035)),
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String value;
  const _TotalRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(fontSize: 12, color: Color(0xFF1A2035)),
        ),
      ],
    );
  }
}

class _OutlineBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _OutlineBtn({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 14),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF6B7280),
        side: const BorderSide(color: Color(0xFFEAECF2), width: 0.5),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        textStyle: const TextStyle(fontSize: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  SHARED: BADGE
// ─────────────────────────────────────────────
class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  final Color bg;
  const _Badge(this.text, this.color, this.bg);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  DATA MODELS
// ─────────────────────────────────────────────
