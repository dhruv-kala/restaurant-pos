import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class KitchenQuery {
  const KitchenQuery({this.stationId, this.priority, this.status, this.search});

  final String? stationId;
  final KitchenPriority? priority;
  final OrderStatus? status;
  final String? search;

  @override
  bool operator ==(Object other) =>
      other is KitchenQuery &&
      other.stationId == stationId &&
      other.priority == priority &&
      other.status == status &&
      other.search == search;

  @override
  int get hashCode => Object.hash(stationId, priority, status, search);
}
