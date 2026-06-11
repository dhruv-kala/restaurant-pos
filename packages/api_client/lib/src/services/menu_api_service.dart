import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class MenuApiService {
  const MenuApiService(this._dio);

  final Dio _dio;

  Future<PaginatedResponse<MenuCategory>> getCategories({
    int page = 1,
    int limit = 20,
    String? search,
    String? tenantId,
  }) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.menuCategories,
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (search != null && search.isNotEmpty) 'search': search,
        if (tenantId != null) 'tenantId': tenantId,
      },
    );
    return PaginatedResponse<MenuCategory>.fromJson(
      _map(response),
      MenuCategory.fromJson,
    );
  }

  Future<MenuCategory> createCategory(Map<String, dynamic> payload) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.menuCategories,
      data: payload,
    );
    return MenuCategory.fromJson(_map(response));
  }

  Future<MenuCategory> updateCategory(
    String id,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.menuCategory(id),
      data: payload,
    );
    return MenuCategory.fromJson(_map(response));
  }

  Future<void> deleteCategory(String id) async {
    await _dio.delete<Object?>(ApiEndpoints.menuCategory(id));
  }

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
    final response = await _dio.get<Object?>(
      ApiEndpoints.menuItems,
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (search != null && search.isNotEmpty) 'search': search,
        if (categoryId != null) 'categoryId': categoryId,
        if (isAvailable != null) 'isAvailable': isAvailable,
        if (tenantId != null) 'tenantId': tenantId,
        if (sortBy != null) 'sortBy': sortBy,
        if (sortDirection != null) 'sortDirection': sortDirection,
      },
    );
    return PaginatedResponse<MenuItem>.fromJson(
      _map(response),
      MenuItem.fromJson,
    );
  }

  Future<MenuItem> createMenuItem(Map<String, dynamic> payload) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.menuItems,
      data: payload,
    );
    return MenuItem.fromJson(_map(response));
  }

  Future<MenuItem> updateMenuItem(
    String id,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.menuItem(id),
      data: payload,
    );
    return MenuItem.fromJson(_map(response));
  }

  Future<void> deleteMenuItem(String id) async {
    await _dio.delete<Object?>(ApiEndpoints.menuItem(id));
  }

  Future<MenuItemVariant> createVariant(
    String itemId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.menuItemVariants(itemId),
      data: payload,
    );
    return MenuItemVariant.fromJson(_map(response));
  }

  Future<void> deleteVariant(String id) async {
    await _dio.delete<Object?>(ApiEndpoints.menuVariant(id));
  }

  Future<MenuItemAddon> createAddon(
    String itemId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.menuItemAddons(itemId),
      data: payload,
    );
    return MenuItemAddon.fromJson(_map(response));
  }

  Future<void> deleteAddon(String id) async {
    await _dio.delete<Object?>(ApiEndpoints.menuAddon(id));
  }
}

Map<String, dynamic> _map(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) {
    return data;
  }
  throw const FormatException('Expected an object response.');
}
