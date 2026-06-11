import 'package:flutter/material.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: AppLoading(message: 'Restoring your session...'),
    );
  }
}
