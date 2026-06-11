import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class BillQuery {
  const BillQuery({this.page = 1, this.status, this.billNumber});

  final int page;
  final BillStatus? status;
  final String? billNumber;

  @override
  bool operator ==(Object other) =>
      other is BillQuery &&
      other.page == page &&
      other.status == status &&
      other.billNumber == billNumber;

  @override
  int get hashCode => Object.hash(page, status, billNumber);
}
