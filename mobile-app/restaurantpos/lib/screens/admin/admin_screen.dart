import 'package:flutter/material.dart';

// ─────────────────────────────────────────────
//  SERVEIQ – Admin Dashboard Screen
//  Pure-veg menu · Updated sidebar · Rich stats
// ─────────────────────────────────────────────

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  int _selectedIndex = 0;

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

  // ── Colours ──────────────────────────────────
  static const Color _dark = Color(0xFF1A2035);
  static const Color _darkAlt = Color(0xFF232D45);
  static const Color _amber = Color(0xFFE8960C);
  static const Color _amberLight = Color(0xFFFFF3DC);
  static const Color _green = Color(0xFF1D9E75);
  static const Color _greenLight = Color(0xFFE1F5EE);
  static const Color _red = Color(0xFFE24B4A);
  static const Color _redLight = Color(0xFFFCEBEB);
  static const Color _blue = Color(0xFF185FA5);
  static const Color _blueLight = Color(0xFFE6F1FB);
  static const Color _surface = Color(0xFFF8F9FC);
  static const Color _card = Colors.white;
  static const Color _border = Color(0xFFEAECF2);
  static const Color _textPrimary = Color(0xFF1A2035);
  static const Color _textSecondary = Color(0xFF6B7280);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _surface,
      body: Row(
        children: [
          _Sidebar(
            items: _navItems,
            selected: _selectedIndex,
            onTap: (i) => setState(() => _selectedIndex = i),
          ),
          Expanded(
            child: Column(
              children: [
                _TopBar(title: 'Dashboard', subtitle: 'Wednesday, 10 Jun 2026 · 8:42 PM', initials: 'AD', color: _green),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── Metric cards ─────────────────────────
                        Row(
                          children: [
                            _MetricCard(icon: Icons.currency_rupee_rounded, iconColor: _amber, iconBg: _amberLight, label: "Today's Revenue", value: '₹42,860', sub: '↑ 12% vs yesterday', subColor: _green),
                            const SizedBox(width: 16),
                            _MetricCard(icon: Icons.shopping_bag_rounded, iconColor: _blue, iconBg: _blueLight, label: 'Orders', value: '148', sub: '62 dine-in · 86 takeaway'),
                            const SizedBox(width: 16),
                            _MetricCard(icon: Icons.groups_rounded, iconColor: _green, iconBg: _greenLight, label: 'Active Staff', value: '9', sub: '3 waiters · 2 cashiers · 4 kitchen'),
                            const SizedBox(width: 16),
                            _MetricCard(icon: Icons.table_restaurant_rounded, iconColor: _amber, iconBg: _amberLight, label: 'Tables Occupied', value: '11 / 16', sub: '5 tables available', subColor: _amber),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // ── Revenue graph placeholder ─────────────
                        _SectionCard(
                          title: 'Revenue — this week',
                          child: SizedBox(
                            height: 180,
                            child: _RevenueChart(),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // ── Bottom row ────────────────────────────
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: _SectionCard(
                                title: 'Top selling today',
                                child: Column(
                                  children: const [
                                    _TopItemRow(icon: Icons.local_fire_department_rounded, iconColor: _amber, iconBg: _amberLight, name: 'Paneer Tikka', orders: '86 orders', price: '₹280'),
                                    _TopItemRow(icon: Icons.eco_rounded, iconColor: _green, iconBg: _greenLight, name: 'Dal Makhani', orders: '71 orders', price: '₹220'),
                                    _TopItemRow(icon: Icons.local_drink_rounded, iconColor: _blue, iconBg: _blueLight, name: 'Mango Lassi', orders: '58 orders', price: '₹120'),
                                    _TopItemRow(icon: Icons.rice_bowl_rounded, iconColor: _amber, iconBg: _amberLight, name: 'Jeera Rice', orders: '44 orders', price: '₹140'),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _SectionCard(
                                title: 'Staff activity',
                                child: Column(
                                  children: const [
                                    _StaffRow(initials: 'RK', name: 'Rahul Kumar', role: 'Cashier · Shift 2', status: 'Active', statusColor: _green, statusBg: _greenLight),
                                    _StaffRow(initials: 'PS', name: 'Priya Singh', role: 'Waiter · Section A', status: 'Active', statusColor: _green, statusBg: _greenLight),
                                    _StaffRow(initials: 'AM', name: 'Amit Mehta', role: 'Waiter · Section B', status: 'Break', statusColor: _amber, statusBg: _amberLight),
                                    _StaffRow(initials: 'VJ', name: 'Vikas Joshi', role: 'Kitchen · Grill', status: 'Active', statusColor: _green, statusBg: _greenLight),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // ── Stock alerts ──────────────────────────
                        _SectionCard(
                          title: 'Inventory alerts',
                          child: Row(
                            children: const [
                              _StockCard(label: 'Paneer', amount: '1.2 kg', status: 'Low', statusColor: _amber, statusBg: _amberLight, bg: _amberLight),
                              SizedBox(width: 12),
                              _StockCard(label: 'Cream', amount: '0.8 L', status: 'Critical', statusColor: _red, statusBg: _redLight, bg: _redLight),
                              SizedBox(width: 12),
                              _StockCard(label: 'Ghee', amount: '2.4 kg', status: 'Low', statusColor: _amber, statusBg: _amberLight, bg: _amberLight),
                              SizedBox(width: 12),
                              _StockCard(label: 'Rice', amount: '18 kg', status: 'OK', statusColor: _green, statusBg: _greenLight, bg: _greenLight),
                            ],
                          ),
                        ),
                      ],
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
//  SIDEBAR
// ─────────────────────────────────────────────
class _NavItem {
  final IconData icon;
  final String label;
  const _NavItem(this.icon, this.label);
}

class _Sidebar extends StatelessWidget {
  final List<_NavItem> items;
  final int selected;
  final ValueChanged<int> onTap;

  const _Sidebar({required this.items, required this.selected, required this.onTap});

  static const Color _dark = Color(0xFF1A2035);
  static const Color _darkAlt = Color(0xFF232D45);
  static const Color _amber = Color(0xFFE8960C);
  static const Color _amberSub = Color(0xFFFFD580);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 210,
      color: _dark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
          Container(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _amber,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.restaurant_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                const Text(
                  'ServeIQ',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),

          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Divider(color: Color(0xFF2E3A55), height: 1),
          ),
          const SizedBox(height: 12),

          // Nav label
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text('MAIN MENU',
                style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w600)),
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
                        border: active
                            ? Border.all(color: _amber.withOpacity(0.3), width: 0.5)
                            : null,
                      ),
                      child: Row(
                        children: [
                          Icon(items[i].icon,
                              size: 18,
                              color: active ? _amber : Colors.white.withOpacity(0.5)),
                          const SizedBox(width: 10),
                          Text(
                            items[i].label,
                            style: TextStyle(
                              color: active ? _amber : Colors.white.withOpacity(0.65),
                              fontSize: 13,
                              fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                          if (active) ...[
                            const Spacer(),
                            Container(
                              width: 5,
                              height: 5,
                              decoration: const BoxDecoration(color: _amber, shape: BoxShape.circle),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Bottom section
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Divider(color: Color(0xFF2E3A55), height: 1),
          ),
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

// ─────────────────────────────────────────────
//  TOP BAR
// ─────────────────────────────────────────────
class _TopBar extends StatelessWidget {
  final String title;
  final String subtitle;
  final String initials;
  final Color color;

  const _TopBar({required this.title, required this.subtitle, required this.initials, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFEAECF2), width: 0.5)),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF1A2035))),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
            ],
          ),
          const Spacer(),
          // Live badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFE1F5EE),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: const [
                Icon(Icons.circle, size: 7, color: Color(0xFF1D9E75)),
                SizedBox(width: 5),
                Text('Live', style: TextStyle(fontSize: 11, color: Color(0xFF0F6E56), fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(width: 14),
          CircleAvatar(
            radius: 17,
            backgroundColor: color.withOpacity(0.15),
            child: Text(initials, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  METRIC CARD
// ─────────────────────────────────────────────
class _MetricCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final String value;
  final String sub;
  final Color? subColor;

  const _MetricCard({
    required this.icon, required this.iconColor, required this.iconBg,
    required this.label, required this.value, required this.sub, this.subColor,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFEAECF2), width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)),
                  child: Icon(icon, color: iconColor, size: 18),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: Color(0xFF1A2035))),
            const SizedBox(height: 4),
            Text(sub, style: TextStyle(fontSize: 11, color: subColor ?? const Color(0xFF6B7280))),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  SECTION CARD
// ─────────────────────────────────────────────
class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEAECF2), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.toUpperCase(),
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280), letterSpacing: 0.8)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  REVENUE CHART (simple bar chart — no package)
// ─────────────────────────────────────────────
class _RevenueChart extends StatelessWidget {
  final List<_BarData> _data = const [
    _BarData('Mon', 28000),
    _BarData('Tue', 34000),
    _BarData('Wed', 42860),
    _BarData('Thu', 31000),
    _BarData('Fri', 38000),
    _BarData('Sat', 45000),
    _BarData('Sun', 29000),
  ];

  const _RevenueChart();

  @override
  Widget build(BuildContext context) {
    final double max = _data.map((e) => e.value).reduce((a, b) => a > b ? a : b);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: _data.map((d) {
        final pct = d.value / max;
        final isToday = d.day == 'Wed';
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 5),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text('₹${(d.value / 1000).toStringAsFixed(0)}k',
                    style: TextStyle(fontSize: 10, color: isToday ? const Color(0xFFE8960C) : const Color(0xFF6B7280))),
                const SizedBox(height: 4),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 600),
                  height: 140 * pct,
                  decoration: BoxDecoration(
                    color: isToday ? const Color(0xFFE8960C) : const Color(0xFFE1F5EE),
                    borderRadius: BorderRadius.circular(6),
                    border: isToday ? null : Border.all(color: const Color(0xFF9FE1CB), width: 0.5),
                  ),
                ),
                const SizedBox(height: 6),
                Text(d.day, style: TextStyle(fontSize: 11, color: isToday ? const Color(0xFFE8960C) : const Color(0xFF6B7280), fontWeight: isToday ? FontWeight.w600 : FontWeight.w400)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _BarData {
  final String day;
  final double value;
  const _BarData(this.day, this.value);
}

// ─────────────────────────────────────────────
//  TOP ITEM ROW
// ─────────────────────────────────────────────
class _TopItemRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String name;
  final String orders;
  final String price;

  const _TopItemRow({required this.icon, required this.iconColor, required this.iconBg, required this.name, required this.orders, required this.price});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: iconColor, size: 16),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(name, style: const TextStyle(fontSize: 13, color: Color(0xFF1A2035)))),
          Text(orders, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: const Color(0xFFE1F5EE), borderRadius: BorderRadius.circular(20)),
            child: Text(price, style: const TextStyle(fontSize: 11, color: Color(0xFF0F6E56), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  STAFF ROW
// ─────────────────────────────────────────────
class _StaffRow extends StatelessWidget {
  final String initials;
  final String name;
  final String role;
  final String status;
  final Color statusColor;
  final Color statusBg;

  const _StaffRow({required this.initials, required this.name, required this.role, required this.status, required this.statusColor, required this.statusBg});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: statusBg,
            child: Text(initials, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(fontSize: 13, color: Color(0xFF1A2035))),
              Text(role, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(20)),
            child: Text(status, style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  STOCK CARD
// ─────────────────────────────────────────────
class _StockCard extends StatelessWidget {
  final String label;
  final String amount;
  final String status;
  final Color statusColor;
  final Color statusBg;
  final Color bg;

  const _StockCard({required this.label, required this.amount, required this.status, required this.statusColor, required this.statusBg, required this.bg});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: statusColor)),
            const SizedBox(height: 6),
            Text(amount, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: statusColor)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(10)),
              child: Text(status, style: TextStyle(fontSize: 10, color: statusColor, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}