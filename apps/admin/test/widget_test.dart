import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_admin/app.dart';
import 'package:restaurant_pos_admin/features/communication/presentation/providers/communication_providers.dart';
import 'package:restaurant_pos_admin/features/communication/presentation/screens/communication_dashboard_screen.dart';
import 'package:restaurant_pos_admin/features/menu/presentation/providers/menu_providers.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

void main() {
  testWidgets('shows the menu administration dashboard', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientConfigProvider.overrideWithValue(
            const ApiClientConfig(baseUrl: 'https://example.invalid'),
          ),
          menuApiServiceProvider.overrideWithValue(_FakeMenuApiService()),
        ],
        child: const AdminApp(),
      ),
    );

    expect(find.text('Menu Management'), findsOneWidget);
    expect(find.text('Categories'), findsOneWidget);
    expect(find.text('Menu Items'), findsOneWidget);
  });

  testWidgets('shows communication analytics metrics', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          communicationApiServiceProvider.overrideWithValue(
            _FakeCommunicationApiService(),
          ),
        ],
        child: const MaterialApp(
          home: Scaffold(body: CommunicationDashboardScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Total messages'), findsOneWidget);
    expect(find.text('10'), findsWidgets);
    expect(find.text('80.0%'), findsWidgets);
    await tester.scrollUntilVisible(
      find.text('Provider performance'),
      400,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('Provider performance'), findsOneWidget);
    expect(find.text('SMTP'), findsOneWidget);
  });
}

class _FakeMenuApiService extends MenuApiService {
  _FakeMenuApiService()
    : super(
        DioClient(
          config: const ApiClientConfig(baseUrl: 'https://example.invalid'),
        ).dio,
      );

  @override
  Future<PaginatedResponse<MenuCategory>> getCategories({
    int page = 1,
    int limit = 20,
    String? search,
    String? tenantId,
  }) async {
    return const PaginatedResponse<MenuCategory>(
      data: <MenuCategory>[],
      meta: PaginationMeta(page: 1, limit: 20, total: 0, totalPages: 0),
    );
  }

  @override
  Future<PaginatedResponse<MenuItem>> getMenuItems({
    int page = 1,
    int limit = 20,
    String? search,
    String? categoryId,
    bool? isAvailable,
    String? tenantId,
    String? sortBy,
    String? sortDirection,
  }) async {
    return const PaginatedResponse<MenuItem>(
      data: <MenuItem>[],
      meta: PaginationMeta(page: 1, limit: 20, total: 0, totalPages: 0),
    );
  }
}

class _FakeCommunicationApiService extends CommunicationApiService {
  _FakeCommunicationApiService()
    : super(
        DioClient(
          config: const ApiClientConfig(baseUrl: 'https://example.invalid'),
        ).dio,
      );

  @override
  Future<CommunicationAnalyticsReport> getAnalytics({
    String? tenantId,
    String? outletId,
    DateTime? from,
    DateTime? to,
    CommunicationAnalyticsGroup groupBy = CommunicationAnalyticsGroup.day,
  }) async {
    final scopeFrom = from ?? DateTime.utc(2026, 6, 1);
    final scopeTo = to ?? DateTime.utc(2026, 6, 30);
    const metrics = CommunicationDeliveryMetrics(
      totalMessages: 10,
      deliveredMessages: 8,
      failedMessages: 2,
      pendingMessages: 0,
      cancelledMessages: 0,
      successRate: 0.8,
      failureRate: 0.2,
    );
    return CommunicationAnalyticsReport(
      scope: CommunicationAnalyticsScope(
        tenantId: 'tenant-1',
        from: scopeFrom,
        to: scopeTo,
        groupBy: groupBy,
      ),
      summary: metrics,
      channels: const [
        CommunicationChannelAnalytics(
          channel: CommunicationChannel.email,
          metrics: metrics,
          averageDeliveryTimeMs: 1200,
        ),
      ],
      providers: const [
        CommunicationProviderAnalytics(
          id: 'provider-1',
          channel: CommunicationChannel.email,
          providerKey: 'smtp',
          displayName: 'SMTP',
          status: CommunicationProviderStatus.active,
          metrics: metrics,
          averageDeliveryTimeMs: 1200,
          averageWebhookLatencyMs: 100,
        ),
      ],
      trends: [
        CommunicationTrendPoint(
          periodStart: scopeFrom,
          totalMessages: 10,
          deliveredMessages: 8,
          failedMessages: 2,
          successRate: 0.8,
        ),
      ],
    );
  }
}
