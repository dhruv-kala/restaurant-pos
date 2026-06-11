import 'package:flutter/material.dart';

import 'category_list_screen.dart';
import 'menu_item_list_screen.dart';

class MenuDashboard extends StatelessWidget {
  const MenuDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Menu Management'),
          bottom: const TabBar(
            tabs: <Widget>[
              Tab(text: 'Categories'),
              Tab(text: 'Menu Items'),
            ],
          ),
        ),
        body: const TabBarView(
          children: <Widget>[CategoryListScreen(), MenuItemListScreen()],
        ),
      ),
    );
  }
}
