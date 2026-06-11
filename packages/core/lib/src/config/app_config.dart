enum AppEnvironment { development, staging, production }

class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    this.environment = AppEnvironment.development,
    this.enableNetworkLogs = false,
  });

  final Uri apiBaseUrl;
  final AppEnvironment environment;
  final bool enableNetworkLogs;

  bool get isProduction => environment == AppEnvironment.production;
}
