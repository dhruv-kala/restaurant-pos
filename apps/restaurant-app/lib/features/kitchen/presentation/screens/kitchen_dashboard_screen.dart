import 'package:flutter/material.dart';

import 'kitchen_analytics_screen.dart';
import 'kitchen_queue_screen.dart';
import 'station_screen.dart';

class KitchenDashboardScreen extends StatelessWidget {
  const KitchenDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Kitchen Dashboard'),
          bottom: const TabBar(
            tabs: <Widget>[
              Tab(icon: Icon(Icons.view_kanban), text: 'Queue'),
              Tab(icon: Icon(Icons.room_service), text: 'Stations'),
              Tab(icon: Icon(Icons.analytics), text: 'Analytics'),
            ],
          ),
        ),
        body: const TabBarView(
          children: <Widget>[
            KitchenQueueScreen(),
            StationScreen(),
            KitchenAnalyticsScreen(),
          ],
        ),
      ),
    );
  }
}
