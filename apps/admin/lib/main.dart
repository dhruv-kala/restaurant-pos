import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';

import 'app.dart';

const _apiBaseUrl = String.fromEnvironment('API_BASE_URL');

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ProviderScope(
      overrides: [
        apiClientConfigProvider.overrideWithValue(
          const ApiClientConfig(baseUrl: _apiBaseUrl),
        ),
      ],
      child: const AdminApp(),
    ),
  );
}
