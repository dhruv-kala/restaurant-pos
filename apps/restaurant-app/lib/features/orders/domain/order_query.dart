import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class OrderQuery {
  const OrderQuery({this.page = 1, this.status, this.orderType, this.search});
  final int page;
  final OrderStatus? status;
  final OrderType? orderType;
  final String? search;
}
