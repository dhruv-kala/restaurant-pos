import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_admin/app.dart';
import 'package:restaurant_pos_admin/features/menu/presentation/providers/menu_providers.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

void main() {
  testWidgets('shows the menu administration dashboard', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          menuApiServiceProvider.overrideWithValue(_FakeMenuApiService()),
        ],
        child: const AdminApp(),
      ),
    );

    expect(find.text('Menu Management'), findsOneWidget);
    expect(find.text('Categories'), findsOneWidget);
    expect(find.text('Menu Items'), findsOneWidget);
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
