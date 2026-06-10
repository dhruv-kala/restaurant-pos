import 'package:flutter/material.dart';

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
  String _selectedCategory = 'All';
  String _searchQuery = '';
  final Map<_MenuItem, int> _cart = {};

  // ── Colours ──────────────────────────────────
  static const Color _dark = Color(0xFF1A2035);
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

  final List<String> _categories = ['All', 'Starters', 'Main Course', 'Breads', 'Rice & Biryani', 'Drinks', 'Desserts'];

  final List<_MenuItem> _allItems = const [
    _MenuItem('Paneer Tikka', 280, 'Starters', '🧀'),
    _MenuItem('Veg Spring Rolls', 160, 'Starters', '🥢'),
    _MenuItem('Hara Bhara Kebab', 180, 'Starters', '🟢'),
    _MenuItem('Aloo Tikki', 120, 'Starters', '🥔'),
    _MenuItem('Butter Paneer Masala', 320, 'Main Course', '🧀'),
    _MenuItem('Dal Makhani', 220, 'Main Course', '🥣'),
    _MenuItem('Kadai Paneer', 300, 'Main Course', '🫕'),
    _MenuItem('Palak Paneer', 280, 'Main Course', '🥬'),
    _MenuItem('Chana Masala', 200, 'Main Course', '🫘'),
    _MenuItem('Mix Veg Curry', 180, 'Main Course', '🥗'),
    _MenuItem('Garlic Naan', 60, 'Breads', '🫓'),
    _MenuItem('Butter Roti', 30, 'Breads', '🫓'),
    _MenuItem('Paratha', 50, 'Breads', '🫓'),
    _MenuItem('Puri', 40, 'Breads', '🫓'),
    _MenuItem('Jeera Rice', 140, 'Rice & Biryani', '🍚'),
    _MenuItem('Veg Biryani', 260, 'Rice & Biryani', '🍛'),
    _MenuItem('Fried Rice', 180, 'Rice & Biryani', '🍳'),
    _MenuItem('Mango Lassi', 120, 'Drinks', '🥭'),
    _MenuItem('Sweet Lassi', 90, 'Drinks', '🥛'),
    _MenuItem('Masala Chaas', 60, 'Drinks', '🫙'),
    _MenuItem('Fresh Lime Soda', 70, 'Drinks', '🍋'),
    _MenuItem('Gulab Jamun', 80, 'Desserts', '🍮'),
    _MenuItem('Kheer', 90, 'Desserts', '🍨'),
    _MenuItem('Rasgulla', 70, 'Desserts', '⚪'),
  ];

  List<_MenuItem> get _filtered {
    return _allItems.where((item) {
      final matchCat = _selectedCategory == 'All' || item.category == _selectedCategory;
      final matchSearch = item.name.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }).toList();
  }

  double get _subtotal => _cart.entries.fold(0, (s, e) => s + e.key.price * e.value);
  double get _gst => _subtotal * 0.05;
  double get _service => _subtotal * 0.02;
  double get _total => _subtotal + _gst + _service;

  void _addToCart(_MenuItem item) => setState(() => _cart[item] = (_cart[item] ?? 0) + 1);
  void _removeFromCart(_MenuItem item) => setState(() {
        final qty = (_cart[item] ?? 0) - 1;
        if (qty <= 0) _cart.remove(item); else _cart[item] = qty;
      });

  final List<_NavItem> _navItems = const [
    _NavItem(Icons.dashboard_rounded, 'Dashboard'),
    _NavItem(Icons.point_of_sale_rounded, 'POS'),
    _NavItem(Icons.table_restaurant_rounded, 'Tables'),
    _NavItem(Icons.restaurant_menu_rounded, 'Kitchen'),
    _NavItem(Icons.inventory_2_rounded, 'Inventory'),
    _NavItem(Icons.menu_book_rounded, 'Menu'),
    _NavItem(Icons.people_rounded, 'Customers'),
    _NavItem(Icons.bar_chart_rounded, 'Reports'),
    _NavItem(Icons.settings_rounded, 'Settings'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _surface,
      body: Row(
        children: [
          _Sidebar(items: _navItems, selected: _selectedNav, onTap: (i) => setState(() => _selectedNav = i)),
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
        border: Border(bottom: BorderSide(color: Color(0xFFEAECF2), width: 0.5)),
      ),
      child: Row(
        children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Cashier POS', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: _textPrimary)),
            Text('Table 7 · Dine-in · 3 guests', style: const TextStyle(fontSize: 12, color: _textSecondary)),
          ]),
          const Spacer(),
          _Badge('Order #148', _blue, _blueLight),
          const SizedBox(width: 12),
          CircleAvatar(
            radius: 17,
            backgroundColor: _blueLight,
            child: const Text('RK', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _blue)),
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
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final cat = _categories[i];
          final active = cat == _selectedCategory;
          return Center(
            child: InkWell(
              onTap: () => setState(() => _selectedCategory = cat),
              borderRadius: BorderRadius.circular(20),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                decoration: BoxDecoration(
                  color: active ? _amber : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: active ? _amber : _border, width: 0.5),
                ),
                child: Text(cat,
                    style: TextStyle(
                      fontSize: 13,
                      color: active ? Colors.white : _textSecondary,
                      fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                    )),
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
                onChanged: (v) => setState(() => _searchQuery = v),
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
    final items = _filtered;
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
        final inCart = _cart.containsKey(item);
        return InkWell(
          onTap: () => _addToCart(item),
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            decoration: BoxDecoration(
              color: inCart ? _greenLight : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: inCart ? const Color(0xFF5DCAA5) : _border, width: inCart ? 1.5 : 0.5),
            ),
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(item.emoji, style: const TextStyle(fontSize: 28)),
                const SizedBox(height: 8),
                Text(item.name, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _textPrimary)),
                const SizedBox(height: 4),
                Text('₹${item.price}', style: TextStyle(fontSize: 12, color: inCart ? _green : _amber, fontWeight: FontWeight.w600)),
                if (inCart) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: _green, borderRadius: BorderRadius.circular(10)),
                    child: Text('${_cart[item]}× added', style: const TextStyle(fontSize: 10, color: Colors.white)),
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
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFEAECF2), width: 0.5))),
            child: Row(
              children: [
                const Text('Current Order', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _textPrimary)),
                const Spacer(),
                _Badge('Table 7', _amber, _amberLight),
              ],
            ),
          ),

          // Cart items
          Expanded(
            child: _cart.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.shopping_cart_outlined, size: 40, color: Color(0xFFD1D5DB)),
                        SizedBox(height: 10),
                        Text('No items added', style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                      ],
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    children: _cart.entries.map((e) => _CartRow(
                      item: e.key,
                      qty: e.value,
                      onAdd: () => _addToCart(e.key),
                      onRemove: () => _removeFromCart(e.key),
                    )).toList(),
                  ),
          ),

          // Totals
          if (_cart.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFFEAECF2), width: 0.5))),
              child: Column(
                children: [
                  _TotalRow('Subtotal', '₹${_subtotal.toStringAsFixed(0)}'),
                  const SizedBox(height: 6),
                  _TotalRow('GST (5%)', '₹${_gst.toStringAsFixed(0)}'),
                  const SizedBox(height: 6),
                  _TotalRow('Service (2%)', '₹${_service.toStringAsFixed(0)}'),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 0.5, color: Color(0xFFEAECF2)),
                  ),
                  Row(
                    children: [
                      const Text('Total', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _textPrimary)),
                      const Spacer(),
                      Text('₹${_total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _textPrimary)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(children: [
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
                  ]),
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
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
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
  final _MenuItem item;
  final int qty;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  const _CartRow({required this.item, required this.qty, required this.onAdd, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
      child: Row(
        children: [
          Text(item.emoji, style: const TextStyle(fontSize: 18)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item.name, style: const TextStyle(fontSize: 12, color: Color(0xFF1A2035))),
              Text('₹${item.price} each', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
            ]),
          ),
          Row(
            children: [
              _QtyBtn(icon: Icons.remove, onTap: onRemove),
              SizedBox(width: 26, child: Text('$qty', textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
              _QtyBtn(icon: Icons.add, onTap: onAdd),
            ],
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 50,
            child: Text('₹${item.price * qty}',
                textAlign: TextAlign.right,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1A2035))),
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
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 12, color: Color(0xFF1A2035))),
      ],
    );
  }
}

class _OutlineBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _OutlineBtn({required this.icon, required this.label, required this.onTap});

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
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
    );
  }
}

// ─────────────────────────────────────────────
//  DATA MODELS
// ─────────────────────────────────────────────
class _MenuItem {
  final String name;
  final int price;
  final String category;
  final String emoji;
  const _MenuItem(this.name, this.price, this.category, this.emoji);
}

class _NavItem {
  final IconData icon;
  final String label;
  const _NavItem(this.icon, this.label);
}

// ─────────────────────────────────────────────
//  SIDEBAR (same across all screens)
// ─────────────────────────────────────────────
class _Sidebar extends StatelessWidget {
  final List<_NavItem> items;
  final int selected;
  final ValueChanged<int> onTap;

  const _Sidebar({required this.items, required this.selected, required this.onTap});

  static const Color _dark = Color(0xFF1A2035);
  static const Color _amber = Color(0xFFE8960C);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 210,
      color: _dark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: _amber, borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.restaurant_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                const Text('ServeIQ', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
              ],
            ),
          ),
          const Padding(padding: EdgeInsets.symmetric(horizontal: 20), child: Divider(color: Color(0xFF2E3A55), height: 1)),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text('MAIN MENU', style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w600)),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              itemCount: items.length,
              itemBuilder: (_, i) {
                final active = i == selected;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: InkWell(
                    onTap: () => onTap(i),
                    borderRadius: BorderRadius.circular(10),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: active ? _amber.withOpacity(0.15) : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: active ? Border.all(color: _amber.withOpacity(0.3), width: 0.5) : null,
                      ),
                      child: Row(
                        children: [
                          Icon(items[i].icon, size: 18, color: active ? _amber : Colors.white.withOpacity(0.5)),
                          const SizedBox(width: 10),
                          Text(items[i].label, style: TextStyle(color: active ? _amber : Colors.white.withOpacity(0.65), fontSize: 13, fontWeight: active ? FontWeight.w600 : FontWeight.w400)),
                          if (active) ...[const Spacer(), Container(width: 5, height: 5, decoration: const BoxDecoration(color: _amber, shape: BoxShape.circle))],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const Padding(padding: EdgeInsets.symmetric(horizontal: 20), child: Divider(color: Color(0xFF2E3A55), height: 1)),
          InkWell(
            onTap: () {},
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  const Icon(Icons.logout_rounded, size: 18, color: Color(0xFFE24B4A)),
                  const SizedBox(width: 10),
                  Text('Logout', style: TextStyle(color: Colors.white.withOpacity(0.65), fontSize: 13)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}