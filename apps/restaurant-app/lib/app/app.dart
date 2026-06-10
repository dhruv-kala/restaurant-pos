import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:serveiq_ui_kit/serveiq_ui_kit.dart';

import '../features/auth/domain/usecases/sign_in.dart';
import '../features/auth/presentation/controllers/login_controller.dart';
import 'router/app_router.dart';

class RestaurantPosApp extends StatefulWidget {
  const RestaurantPosApp({required this.signIn, super.key});

  final SignIn signIn;

  @override
  State<RestaurantPosApp> createState() => _RestaurantPosAppState();
}

class _RestaurantPosAppState extends State<RestaurantPosApp> {
  late final AppRouter _appRouter;

  @override
  void initState() {
    super.initState();
    _appRouter = AppRouter();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => LoginController(signIn: widget.signIn),
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        title: 'ServeIQ',
        theme: AppTheme.lightTheme,
        routerConfig: _appRouter.config,
      ),
    );
  }
}
