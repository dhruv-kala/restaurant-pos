import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import 'router/app_router.dart';

class RestaurantPosApp extends ConsumerStatefulWidget {
  const RestaurantPosApp({super.key});

  @override
  ConsumerState<RestaurantPosApp> createState() => _RestaurantPosAppState();
}

class _RestaurantPosAppState extends ConsumerState<RestaurantPosApp> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(
      ref.read(authNotifierProvider.notifier).restoreSession,
    );
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'ServeIQ',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      routerConfig: router,
    );
  }
}
