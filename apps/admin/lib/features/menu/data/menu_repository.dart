import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/menu_query.dart';

class MenuRepository {
  const MenuRepository(this._api);

  final MenuApiService _api;

  Future<PaginatedResponse<MenuCategory>> categories(MenuQuery query) {
    return _api.getCategories(
      page: query.page,
      limit: query.limit,
      search: query.search,
    );
  }

  Future<PaginatedResponse<MenuItem>> items(MenuQuery query) {
    return _api.getMenuItems(
      page: query.page,
      limit: query.limit,
      search: query.search,
      categoryId: query.categoryId,
    );
  }

  Future<MenuCategory> saveCategory({
    String? id,
    required Map<String, dynamic> payload,
  }) {
    return id == null
        ? _api.createCategory(payload)
        : _api.updateCategory(id, payload);
  }

  Future<MenuItem> saveItem({
    String? id,
    required Map<String, dynamic> payload,
  }) {
    return id == null
        ? _api.createMenuItem(payload)
        : _api.updateMenuItem(id, payload);
  }

  Future<void> deleteCategory(String id) => _api.deleteCategory(id);

  Future<void> deleteItem(String id) => _api.deleteMenuItem(id);
}
