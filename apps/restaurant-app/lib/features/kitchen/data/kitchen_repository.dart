import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/kitchen_query.dart';

class KitchenRepository {
  const KitchenRepository(this._api);
  final KitchenApiService _api;

  Future<List<KitchenStation>> stations() => _api.getStations();
  Future<KitchenStation> createStation(Map<String, dynamic> data) =>
      _api.createStation(data);
  Future<KitchenStation> updateStation(String id, Map<String, dynamic> data) =>
      _api.updateStation(id, data);
  Future<void> deleteStation(String id) => _api.deleteStation(id);
  Future<List<KitchenQueueOrder>> queue(KitchenQuery query) => _api.getQueue(
    stationId: query.stationId,
    priority: query.priority,
    status: query.status,
    search: query.search,
  );
  Future<KitchenMetrics> metrics([String? stationId]) =>
      _api.getMetrics(stationId: stationId);
  Future<KitchenQueueOrder> updateItem(String id, OrderItemStatus status) =>
      _api.updateItemStatus(id, status);
  Future<KitchenQueueOrder> updateOrder(String id, OrderStatus status) =>
      _api.updateOrderStatus(id, status);
}
