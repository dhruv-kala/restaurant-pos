import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../api_endpoints.dart';

class ReportsApiService {
  const ReportsApiService(this._dio);
  final Dio _dio;

  Future<SalesSummaryReport> getSalesSummary([
    Map<String, dynamic>? query,
  ]) async => SalesSummaryReport.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.salesSummaryReport,
        queryParameters: query,
      ),
    ),
  );
  Future<List<ReportSeriesPoint>> getDailySales([
    Map<String, dynamic>? query,
  ]) => _points(ApiEndpoints.dailySalesReport, query);
  Future<List<ReportSeriesPoint>> getMonthlySales([
    Map<String, dynamic>? query,
  ]) => _points(ApiEndpoints.monthlySalesReport, query);
  Future<List<ReportSeriesPoint>> getItemSales([Map<String, dynamic>? query]) =>
      _points(ApiEndpoints.itemSalesReport, query);
  Future<List<ReportSeriesPoint>> getCategorySales([
    Map<String, dynamic>? query,
  ]) => _points(ApiEndpoints.categorySalesReport, query);
  Future<GSTSummaryReport> getGSTSummary([Map<String, dynamic>? query]) async =>
      GSTSummaryReport.fromJson(
        _map(
          await _dio.get<Object?>(
            ApiEndpoints.gstSummaryReport,
            queryParameters: query,
          ),
        ),
      );
  Future<PaymentSummaryReport> getPaymentSummary([
    Map<String, dynamic>? query,
  ]) async => PaymentSummaryReport.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.paymentSummaryReport,
        queryParameters: query,
      ),
    ),
  );
  Future<InventorySummaryReport> getInventoryReports([
    Map<String, dynamic>? query,
  ]) async => InventorySummaryReport.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.inventoryValueReport,
        queryParameters: query,
      ),
    ),
  );
  Future<List<CustomerSummaryReport>> getCustomerReports([
    Map<String, dynamic>? query,
  ]) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.customerTopReport,
      queryParameters: query,
    ),
    CustomerSummaryReport.fromJson,
  );
  Future<List<OutletPerformanceReport>> getOutletReports([
    Map<String, dynamic>? query,
  ]) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.outletPerformanceReport,
      queryParameters: query,
    ),
    OutletPerformanceReport.fromJson,
  );
  Future<DashboardMetrics> getDashboardMetrics([
    Map<String, dynamic>? query,
  ]) async => DashboardMetrics.fromJson(
    _map(
      await _dio.get<Object?>(ApiEndpoints.dashboard, queryParameters: query),
    ),
  );
  Future<Map<String, dynamic>> getKitchenReport([
    Map<String, dynamic>? query,
  ]) async => _map(
    await _dio.get<Object?>(
      ApiEndpoints.kitchenPerformanceReport,
      queryParameters: query,
    ),
  );
  Future<List<Map<String, dynamic>>> getStaffReport([
    Map<String, dynamic>? query,
  ]) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.staffPerformanceReport,
      queryParameters: query,
    ),
    (json) => json,
  );

  Future<List<ReportSeriesPoint>> _points(
    String endpoint,
    Map<String, dynamic>? query,
  ) async => _list(
    await _dio.get<Object?>(endpoint, queryParameters: query),
    ReportSeriesPoint.fromJson,
  );
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map)
    return Map<String, dynamic>.from(response.data! as Map);
  throw const FormatException('Expected an object response.');
}

List<T> _list<T>(
  Response<Object?> response,
  T Function(Map<String, dynamic>) parser,
) {
  if (response.data is! List)
    throw const FormatException('Expected a list response.');
  return (response.data! as List)
      .map((item) => parser(Map<String, dynamic>.from(item as Map)))
      .toList(growable: false);
}
