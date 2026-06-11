import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/kds_query.dart';

class KdsRepository {
  const KdsRepository(this._api);
  final KdsApiService _api;

  Future<List<KitchenTicket>> queue(KdsQuery query) => _api.getQueue(
    kitchenCategoryId: query.kitchenCategoryId,
    priority: query.priority,
    status: query.status,
    search: query.search,
  );
  Future<List<KitchenTicket>> active() => _api.getActiveOrders();
  Future<List<KitchenTicket>> ready() => _api.getReadyOrders();
  Future<List<KitchenTicket>> completed() => _api.getCompletedOrders();
  Future<List<KitchenCategory>> categories() => _api.getCategories();
  Future<KitchenTicket> startItem(String id) => _api.startItem(id);
  Future<KitchenTicket> readyItem(String id) => _api.markReady(id);
  Future<KitchenTicket> servedItem(String id) => _api.markServed(id);
  Future<KitchenTicket> startOrder(String id) => _api.startOrder(id);
  Future<KitchenTicket> readyOrder(String id) => _api.readyOrder(id);
}
