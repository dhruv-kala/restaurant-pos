import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../../data/reports_repository.dart';
import '../../domain/report_query.dart';

final reportsApiServiceProvider = Provider<ReportsApiService>(
  (ref) => ReportsApiService(ref.watch(dioProvider)),
);
final reportsRepositoryProvider = Provider<ReportsRepository>(
  (ref) => ReportsRepository(ref.watch(reportsApiServiceProvider)),
);
final dashboardProvider = FutureProvider.autoDispose
    .family<DashboardMetrics, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).dashboard(query),
    );
final salesReportProvider = FutureProvider.autoDispose
    .family<SalesSummaryReport, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).sales(query),
    );
final gstReportProvider = FutureProvider.autoDispose
    .family<GSTSummaryReport, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).gst(query),
    );
final paymentReportProvider = FutureProvider.autoDispose
    .family<PaymentSummaryReport, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).payments(query),
    );
final inventoryReportProvider = FutureProvider.autoDispose
    .family<InventorySummaryReport, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).inventory(query),
    );
final customerReportProvider = FutureProvider.autoDispose
    .family<List<CustomerSummaryReport>, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).customers(query),
    );
final outletReportProvider = FutureProvider.autoDispose
    .family<List<OutletPerformanceReport>, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).outlets(query),
    );
final kitchenReportProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).kitchen(query),
    );
final staffReportProvider = FutureProvider.autoDispose
    .family<List<Map<String, dynamic>>, ReportQuery>(
      (ref, query) => ref.watch(reportsRepositoryProvider).staff(query),
    );
