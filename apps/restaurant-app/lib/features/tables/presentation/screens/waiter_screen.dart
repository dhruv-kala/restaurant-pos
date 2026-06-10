import 'package:flutter/material.dart';
import 'package:serveiq_ui_kit/serveiq_ui_kit.dart';

// ─────────────────────────────────────────────
//  SERVEIQ – Waiter Screen
//  Table overview · Active orders · Actions
// ─────────────────────────────────────────────

class WaiterScreen extends StatefulWidget {
  const WaiterScreen({super.key});

  @override
  State<WaiterScreen> createState() => _WaiterScreenState();
}

class _WaiterScreenState extends State<WaiterScreen> {
  int _selectedNav = 2; // Tables index
  int? _selectedTable;

  // ── Colours ──────────────────────────────────
  static const Color _dark = Color(0xFF1A2035);
  static const Color _amber = Color(0xFFE8960C);
  static const Color _amberLight = Color(0xFFFFF3DC);
  static const Color _green = Color(0xFF1D9E75);
  static const Color _greenLight = Color(0xFFE1F5EE);
  static const Color _red = Color(0xFFE24B4A);
  static const Color _redLight = Color(0xFFFCEBEB);
  static const Color _surface = Color(0xFFF8F9FC);
  static const Color _border = Color(0xFFEAECF2);
  static const Color _textPrimary = Color(0xFF1A2035);
  static const Color _textSecondary = Color(0xFF6B7280);

  final List<_TableData> _tables = [
    _TableData(1, 4, TableStatus.served, 'Order #139'),
    _TableData(2, 2, TableStatus.billRequested, 'Order #141'),
    _TableData(3, 6, TableStatus.ordering, 'Order #145'),
    _TableData(4, 0, TableStatus.free, null),
    _TableData(5, 3, TableStatus.waiting, 'Order #146'),
    _TableData(6, 5, TableStatus.served, 'Order #142'),
    _TableData(7, 0, TableStatus.free, null),
    _TableData(8, 0, TableStatus.free, null),
  ];

  final List<_OrderData> _orders = [
    _OrderData(
      tableNo: 3,
      orderNo: '#145',
      guests: 6,
      minutesAgo: 12,
      status: OrderStatus.waiting,
      items: [
        '2× Butter Paneer Masala',
        '3× Garlic Naan',
        '2× Dal Makhani',
        '6× Mango Lassi',
      ],
    ),
    _OrderData(
      tableNo: 2,
      orderNo: '#141',
      guests: 2,
      minutesAgo: 35,
      status: OrderStatus.billRequested,
      items: ['1× Paneer Tikka', '2× Butter Roti', '1× Kadai Paneer'],
    ),
    _OrderData(
      tableNo: 1,
      orderNo: '#139',
      guests: 4,
      minutesAgo: 48,
      status: OrderStatus.served,
      items: ['1× Butter Paneer Masala', '2× Jeera Rice', '4× Gulab Jamun'],
    ),
  ];

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
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── Metrics ───────────────────────────────
                        Row(
                          children: [
                            _buildMiniMetric(
                              Icons.table_restaurant_rounded,
                              _amber,
                              _amberLight,
                              'My Tables',
                              '8',
                              '5 occupied · 3 free',
                            ),
                            const SizedBox(width: 16),
                            _buildMiniMetric(
                              Icons.access_time_rounded,
                              _red,
                              _redLight,
                              'Pending',
                              '3',
                              '2 orders · 1 bill request',
                              valueColor: _red,
                            ),
                            const SizedBox(width: 16),
                            _buildMiniMetric(
                              Icons.check_circle_outline_rounded,
                              _green,
                              _greenLight,
                              'Served today',
                              '14',
                              'Across all tables',
                            ),
                            const SizedBox(width: 16),
                            _buildMiniMetric(
                              Icons.timer_outlined,
                              _amber,
                              _amberLight,
                              'Avg. serve time',
                              '18 min',
                              'Last 10 orders',
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // ── Table grid ────────────────────────────
                        _SectionHeader(title: 'Table Overview — Section A'),
                        const SizedBox(height: 14),
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 4,
                                childAspectRatio: 1.35,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                              ),
                          itemCount: _tables.length,
                          itemBuilder: (_, i) => _TableTile(
                            data: _tables[i],
                            selected: _selectedTable == _tables[i].tableNo,
                            onTap: () => setState(
                              () => _selectedTable = _tables[i].tableNo,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // ── Active orders ─────────────────────────
                        _SectionHeader(title: 'Active Orders'),
                        const SizedBox(height: 14),
                        ..._orders.map(
                          (o) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _OrderCard(
                              order: o,
                              onMarkServed: () => _showSnack(
                                context,
                                'Table ${o.tableNo} marked as served',
                              ),
                              onSendToCashier: () => _showSnack(
                                context,
                                'Bill sent to cashier for Table ${o.tableNo}',
                              ),
                              onAddItems: () => _showSnack(
                                context,
                                'Opening menu for Table ${o.tableNo}',
                              ),
                              onRequestBill: () => _showSnack(
                                context,
                                'Bill requested for Table ${o.tableNo}',
                              ),
                            ),
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

  void _showSnack(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        behavior: SnackBarBehavior.floating,
        backgroundColor: _dark,
        duration: const Duration(seconds: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  Widget _buildTopBar() {
    final pending = _orders.where((o) => o.status != OrderStatus.served).length;
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
                'Waiter Panel',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: _textPrimary,
                ),
              ),
              const Text(
                'Section A · 8 tables assigned',
                style: TextStyle(fontSize: 12, color: _textSecondary),
              ),
            ],
          ),
          const Spacer(),
          if (pending > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: _amberLight,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.notifications_rounded,
                    size: 14,
                    color: _amber,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '$pending pending',
                    style: const TextStyle(
                      fontSize: 11,
                      color: _amber,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(width: 12),
          CircleAvatar(
            radius: 17,
            backgroundColor: _amberLight,
            child: const Text(
              'PS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _amber,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniMetric(
    IconData icon,
    Color color,
    Color bg,
    String label,
    String value,
    String sub, {
    Color? valueColor,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _border, width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 16),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: _textSecondary),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: valueColor ?? _textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              sub,
              style: const TextStyle(fontSize: 11, color: _textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  TABLE TILE
// ─────────────────────────────────────────────
class _TableTile extends StatelessWidget {
  final _TableData data;
  final bool selected;
  final VoidCallback onTap;

  const _TableTile({
    required this.data,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final status = data.status;
    final Color bg;
    final Color border;
    final Color labelColor;
    final Color textColor;
    final String statusText;

    switch (status) {
      case TableStatus.free:
        bg = const Color(0xFFF8F9FC);
        border = const Color(0xFFEAECF2);
        labelColor = const Color(0xFF6B7280);
        textColor = const Color(0xFF1A2035);
        statusText = 'Available';
      case TableStatus.served:
        bg = const Color(0xFFE1F5EE);
        border = const Color(0xFF5DCAA5);
        labelColor = const Color(0xFF0F6E56);
        textColor = const Color(0xFF085041);
        statusText = 'Served';
      case TableStatus.ordering:
        bg = const Color(0xFFE6F1FB);
        border = const Color(0xFF378ADD);
        labelColor = const Color(0xFF185FA5);
        textColor = const Color(0xFF0C447C);
        statusText = 'Ordering';
      case TableStatus.waiting:
        bg = const Color(0xFFFFF3DC);
        border = const Color(0xFFFAC775);
        labelColor = const Color(0xFF854F0B);
        textColor = const Color(0xFF633806);
        statusText = 'Waiting';
      case TableStatus.billRequested:
        bg = const Color(0xFFFCEBEB);
        border = const Color(0xFFF09595);
        labelColor = const Color(0xFFA32D2D);
        textColor = const Color(0xFF791F1F);
        statusText = 'Bill req.';
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? const Color(0xFF1A2035) : border,
            width: selected ? 2 : 1,
          ),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'T${data.tableNo}',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: textColor,
              ),
            ),
            const SizedBox(height: 4),
            if (data.status != TableStatus.free)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.people_rounded, size: 12, color: labelColor),
                  const SizedBox(width: 3),
                  Text(
                    '${data.guests}',
                    style: TextStyle(fontSize: 11, color: labelColor),
                  ),
                ],
              ),
            const SizedBox(height: 5),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                statusText,
                style: TextStyle(
                  fontSize: 10,
                  color: labelColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  ORDER CARD
// ─────────────────────────────────────────────
class _OrderCard extends StatelessWidget {
  final _OrderData order;
  final VoidCallback onMarkServed;
  final VoidCallback onSendToCashier;
  final VoidCallback onAddItems;
  final VoidCallback onRequestBill;

  const _OrderCard({
    required this.order,
    required this.onMarkServed,
    required this.onSendToCashier,
    required this.onAddItems,
    required this.onRequestBill,
  });

  @override
  Widget build(BuildContext context) {
    final Color statusColor;
    final Color statusBg;
    final String statusText;
    final IconData statusIcon;

    switch (order.status) {
      case OrderStatus.waiting:
        statusColor = const Color(0xFF854F0B);
        statusBg = const Color(0xFFFFF3DC);
        statusText = 'Waiting';
        statusIcon = Icons.access_time_rounded;
      case OrderStatus.billRequested:
        statusColor = const Color(0xFFA32D2D);
        statusBg = const Color(0xFFFCEBEB);
        statusText = 'Bill requested';
        statusIcon = Icons.receipt_long_rounded;
      case OrderStatus.served:
        statusColor = const Color(0xFF0F6E56);
        statusBg = const Color(0xFFE1F5EE);
        statusText = 'Served';
        statusIcon = Icons.check_circle_rounded;
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEAECF2), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(statusIcon, color: statusColor, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Table ${order.tableNo} — Order ${order.orderNo}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1A2035),
                        ),
                      ),
                      Text(
                        '${order.guests} guests · ${order.minutesAgo} min ago',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(
                      fontSize: 11,
                      color: statusColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Divider
          const Divider(height: 0.5, color: Color(0xFFEAECF2)),

          // Items
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: order.items
                  .map(
                    (item) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F9FC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: const Color(0xFFEAECF2),
                          width: 0.5,
                        ),
                      ),
                      child: Text(
                        item,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF1A2035),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),

          // Divider
          const Divider(height: 0.5, color: Color(0xFFEAECF2)),

          // Actions
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
            child: Row(
              children: [
                if (order.status == OrderStatus.waiting)
                  _ActionBtn(
                    icon: Icons.check_rounded,
                    label: 'Mark Served',
                    primary: true,
                    onTap: onMarkServed,
                  ),
                if (order.status == OrderStatus.billRequested)
                  _ActionBtn(
                    icon: Icons.send_rounded,
                    label: 'Send to Cashier',
                    primary: true,
                    onTap: onSendToCashier,
                  ),
                if (order.status == OrderStatus.served) ...[
                  _ActionBtn(
                    icon: Icons.add_rounded,
                    label: 'Add Items',
                    primary: false,
                    onTap: onAddItems,
                  ),
                  const SizedBox(width: 8),
                  _ActionBtn(
                    icon: Icons.receipt_long_rounded,
                    label: 'Request Bill',
                    primary: false,
                    onTap: onRequestBill,
                  ),
                ],
                if (order.status != OrderStatus.served) ...[
                  const SizedBox(width: 8),
                  _ActionBtn(
                    icon: Icons.edit_rounded,
                    label: 'Edit Order',
                    primary: false,
                    onTap: () {},
                  ),
                  const SizedBox(width: 8),
                  _ActionBtn(
                    icon: Icons.chat_bubble_outline_rounded,
                    label: 'Note',
                    primary: false,
                    onTap: () {},
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool primary;
  final VoidCallback onTap;
  const _ActionBtn({
    required this.icon,
    required this.label,
    required this.primary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (primary) {
      return ElevatedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 14),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF1D9E75),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
      );
    }
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 14),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF6B7280),
        side: const BorderSide(color: Color(0xFFEAECF2), width: 0.5),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        textStyle: const TextStyle(fontSize: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  SECTION HEADER
// ─────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: Color(0xFF6B7280),
        letterSpacing: 0.8,
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  DATA MODELS
// ─────────────────────────────────────────────
enum TableStatus { free, served, ordering, waiting, billRequested }

enum OrderStatus { waiting, served, billRequested }

class _TableData {
  final int tableNo;
  final int guests;
  final TableStatus status;
  final String? orderNo;
  const _TableData(this.tableNo, this.guests, this.status, this.orderNo);
}

class _OrderData {
  final int tableNo;
  final String orderNo;
  final int guests;
  final int minutesAgo;
  final OrderStatus status;
  final List<String> items;
  const _OrderData({
    required this.tableNo,
    required this.orderNo,
    required this.guests,
    required this.minutesAgo,
    required this.status,
    required this.items,
  });
}
