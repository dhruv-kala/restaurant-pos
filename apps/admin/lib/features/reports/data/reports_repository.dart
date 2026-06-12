import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../domain/report_query.dart';

class ReportsRepository {
  const ReportsRepository(this._api);
  final ReportsApiService _api;
  Future<DashboardMetrics> dashboard(ReportQuery query) =>
      _api.getDashboardMetrics(query.toJson());
  Future<SalesSummaryReport> sales(ReportQuery query) =>
      _api.getSalesSummary(query.toJson());
  Future<GSTSummaryReport> gst(ReportQuery query) =>
      _api.getGSTSummary(query.toJson());
  Future<PaymentSummaryReport> payments(ReportQuery query) =>
      _api.getPaymentSummary(query.toJson());
  Future<InventorySummaryReport> inventory(ReportQuery query) =>
      _api.getInventoryReports(query.toJson());
  Future<List<CustomerSummaryReport>> customers(ReportQuery query) =>
      _api.getCustomerReports(query.toJson());
  Future<List<OutletPerformanceReport>> outlets(ReportQuery query) =>
      _api.getOutletReports(query.toJson());
  Future<Map<String, dynamic>> kitchen(ReportQuery query) =>
      _api.getKitchenReport(query.toJson());
  Future<List<Map<String, dynamic>>> staff(ReportQuery query) =>
      _api.getStaffReport(query.toJson());
}
