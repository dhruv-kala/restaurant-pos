import 'package:flutter/material.dart';

import 'completed_orders_screen.dart';
import 'kitchen_queue_screen.dart';
import 'ready_orders_screen.dart';

class KitchenDashboardScreen extends StatelessWidget {
  const KitchenDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Kitchen Display System'),
          bottom: const TabBar(
            tabs: <Widget>[
              Tab(text: 'Queue'),
              Tab(text: 'Ready'),
              Tab(text: 'Completed'),
            ],
          ),
        ),
        body: const TabBarView(
          children: <Widget>[
            KdsQueueScreen(),
            ReadyOrdersScreen(),
            CompletedOrdersScreen(),
          ],
        ),
      ),
    );
  }
}
