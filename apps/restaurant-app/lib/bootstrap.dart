import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';

import 'app/app.dart';

const _apiBaseUrl = String.fromEnvironment('API_BASE_URL');

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (_apiBaseUrl.isEmpty) {
    runApp(const _MissingConfigurationApp());
    return;
  }

  runApp(
    ProviderScope(
      overrides: [
        apiClientConfigProvider.overrideWithValue(
          const ApiClientConfig(baseUrl: _apiBaseUrl),
        ),
      ],
      child: const RestaurantPosApp(),
    ),
  );
}

class _MissingConfigurationApp extends StatelessWidget {
  const _MissingConfigurationApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'API_BASE_URL is not configured. Start the app with '
              '--dart-define=API_BASE_URL=https://host/api/v1.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}
