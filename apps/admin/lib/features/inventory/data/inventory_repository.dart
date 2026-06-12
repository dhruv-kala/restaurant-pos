import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../domain/inventory_query.dart';

class InventoryRepository {
  const InventoryRepository(this._api);
  final InventoryApiService _api;

  Future<List<InventoryCategory>> categories() => _api.getCategories();
  Future<InventoryCategory> createCategory(Map<String, dynamic> payload) =>
      _api.createCategory(payload);
  Future<List<UnitOfMeasure>> units() => _api.getUnits();
  Future<UnitOfMeasure> createUnit(Map<String, dynamic> payload) =>
      _api.createUnit(payload);
  Future<PaginatedResponse<Ingredient>> ingredients(InventoryQuery query) =>
      _api.getIngredients(
        page: query.page,
        limit: query.limit,
        search: query.search,
        tenantId: query.tenantId,
      );
  Future<Ingredient> ingredient(String id) => _api.getIngredient(id);
  Future<Ingredient> createIngredient(Map<String, dynamic> payload) =>
      _api.createIngredient(payload);
  Future<Ingredient> updateIngredient(
    String id,
    Map<String, dynamic> payload,
  ) => _api.updateIngredient(id, payload);
  Future<PaginatedResponse<InventoryStock>> stocks(InventoryQuery query) =>
      _api.getStocks(
        page: query.page,
        limit: query.limit,
        search: query.search,
        tenantId: query.tenantId,
        outletId: query.outletId,
      );
  Future<StockTransaction> adjustStock(Map<String, dynamic> payload) =>
      _api.adjustStock(payload);
  Future<Map<String, dynamic>> transferStock(Map<String, dynamic> payload) =>
      _api.transferStock(payload);
  Future<PaginatedResponse<Vendor>> vendors(InventoryQuery query) =>
      _api.getVendors(
        page: query.page,
        limit: query.limit,
        search: query.search,
        tenantId: query.tenantId,
      );
  Future<Vendor> createVendor(Map<String, dynamic> payload) =>
      _api.createVendor(payload);
  Future<PaginatedResponse<PurchaseOrder>> purchaseOrders(
    InventoryQuery query,
  ) => _api.getPurchaseOrders(
    page: query.page,
    limit: query.limit,
    tenantId: query.tenantId,
    outletId: query.outletId,
    status: query.status,
  );
  Future<PurchaseOrder> createPurchaseOrder(Map<String, dynamic> payload) =>
      _api.createPurchaseOrder(payload);
  Future<PurchaseOrder> updatePurchaseOrder(
    String id,
    Map<String, dynamic> payload,
  ) => _api.updatePurchaseOrder(id, payload);
  Future<PurchaseOrder> receivePurchaseOrder(String id) =>
      _api.receivePurchaseOrder(id);
  Future<PaginatedResponse<InventoryAlert>> alerts(InventoryQuery query) =>
      _api.getAlerts(
        page: query.page,
        limit: query.limit,
        tenantId: query.tenantId,
        outletId: query.outletId,
        alertType: query.alertType,
      );
  Future<InventoryAlert> resolveAlert(String id) => _api.resolveAlert(id);
  Future<InventoryValuation> valuation(InventoryQuery query) =>
      _api.getInventoryValuation(
        tenantId: query.tenantId,
        outletId: query.outletId,
      );
}
