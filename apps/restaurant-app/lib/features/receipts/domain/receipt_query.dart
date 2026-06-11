import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class ReceiptQuery {
  const ReceiptQuery({this.type, this.status, this.search});
  final ReceiptType? type;
  final ReceiptStatus? status;
  final String? search;

  @override
  bool operator ==(Object other) =>
      other is ReceiptQuery &&
      other.type == type &&
      other.status == status &&
      other.search == search;

  @override
  int get hashCode => Object.hash(type, status, search);
}
