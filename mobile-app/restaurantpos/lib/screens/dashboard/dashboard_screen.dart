import 'package:flutter/material.dart';

import '../../core/widgets/app_header.dart';
import '../../core/widgets/app_sidebar.dart';
import '../../core/widgets/dashboard_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  Widget panel(String title) {
    return Card(
      child: Center(
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [

          const AppSidebar(),

          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [

                  const AppHeader(),

                  const SizedBox(height: 20),

                  Row(
                    children: [

                      const Expanded(
                        child: DashboardCard(
                          title: 'Revenue',
                          value: '₹25,430',
                          icon: Icons.currency_rupee,
                        ),
                      ),

                      const SizedBox(width: 15),

                      const Expanded(
                        child: DashboardCard(
                          title: 'Orders',
                          value: '142',
                          icon: Icons.shopping_cart,
                        ),
                      ),

                      const SizedBox(width: 15),

                      const Expanded(
                        child: DashboardCard(
                          title: 'Tables',
                          value: '18 / 24',
                          icon: Icons.table_restaurant,
                        ),
                      ),

                      const SizedBox(width: 15),

                      const Expanded(
                        child: DashboardCard(
                          title: 'Customers',
                          value: '845',
                          icon: Icons.people,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  Expanded(
                    child: Row(
                      children: [

                        Expanded(
                          flex: 2,
                          child: panel(
                            'Sales Trend Chart',
                          ),
                        ),

                        const SizedBox(width: 20),

                        Expanded(
                          child: panel(
                            'Top Selling Items',
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  Expanded(
                    child: Row(
                      children: [

                        Expanded(
                          child: panel(
                            'Recent Orders',
                          ),
                        ),

                        const SizedBox(width: 20),

                        Expanded(
                          child: panel(
                            'Kitchen Status',
                          ),
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}