import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/order_query.dart';

class OrdersRepository {
  const OrdersRepository(this._api);
  final OrdersApiService _api;

  Future<PaginatedResponse<Order>> activeOrders(OrderQuery query) =>
      _api.getOrders(
        page: query.page,
        status: query.status,
        orderType: query.orderType,
        search: query.search,
      );
  Future<Order> order(String id) => _api.getOrder(id);
  Future<List<Order>> kitchenQueue() => _api.getKitchenQueue();
  Future<Order> create(Map<String, dynamic> data) => _api.createOrder(data);
  Future<Order> update(String id, Map<String, dynamic> data) =>
      _api.updateOrder(id, data);
  Future<Order> status(String id, OrderStatus status) =>
      _api.updateStatus(id, status);
}
