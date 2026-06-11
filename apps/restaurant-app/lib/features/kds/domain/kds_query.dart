import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class KdsQuery {
  const KdsQuery({
    this.kitchenCategoryId,
    this.priority,
    this.status,
    this.search,
  });

  final String? kitchenCategoryId;
  final OrderPriority? priority;
  final OrderStatus? status;
  final String? search;

  @override
  bool operator ==(Object other) =>
      other is KdsQuery &&
      other.kitchenCategoryId == kitchenCategoryId &&
      other.priority == priority &&
      other.status == status &&
      other.search == search;

  @override
  int get hashCode => Object.hash(kitchenCategoryId, priority, status, search);
}
