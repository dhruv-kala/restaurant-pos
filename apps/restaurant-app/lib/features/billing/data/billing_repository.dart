import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/bill_query.dart';

class BillingRepository {
  const BillingRepository(this._api);
  final BillingApiService _api;

  Future<PaginatedResponse<Bill>> bills(BillQuery query) => _api.getBills(
    page: query.page,
    status: query.status,
    billNumber: query.billNumber,
  );
  Future<Bill> bill(String id) => _api.getBill(id);
  Future<Bill> generate(String orderId, Map<String, dynamic> data) =>
      _api.generateBill(orderId, data: data);
  Future<Bill> update(String id, Map<String, dynamic> data) =>
      _api.updateBill(id, data);
  Future<Bill> voidBill(String id, String reason) => _api.voidBill(id, reason);
  Future<List<Bill>> split(String id, Map<String, dynamic> data) =>
      _api.splitBill(id, data);
  Future<Bill> merge(List<String> ids) => _api.mergeBills(ids);
  Future<Bill> printable(String id) => _api.getPrintableBill(id);
}
