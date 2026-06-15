import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/tax_repository.dart';
import '../../domain/tax_query.dart';

final taxApiServiceProvider = Provider<TaxApiService>(
  (ref) => TaxApiService(ref.watch(dioProvider)),
);

final taxRepositoryProvider = Provider<TaxRepository>(
  (ref) => TaxRepository(ref.watch(taxApiServiceProvider)),
);

final taxProfilesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TaxProfile>, TaxListQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).profiles(query),
    );

final taxRatesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TaxRate>, TaxListQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).rates(query),
    );

final taxGroupsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TaxGroup>, TaxListQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).groups(query),
    );

final taxRulesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TaxRule>, TaxListQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).rules(query),
    );

final taxMappingsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TaxCategoryMapping>, TaxListQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).mappings(query),
    );

final fiscalPoliciesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<OutletFiscalPolicy>, TaxListQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).fiscalPolicies(query),
    );

final fiscalSequencesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<FiscalInvoiceSequence>, TaxListQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).fiscalSequences(query),
    );

final taxReportSummaryProvider = FutureProvider.autoDispose
    .family<TaxReportSummary, TaxReportQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).reportSummary(query),
    );

final taxReportDetailsProvider = FutureProvider.autoDispose
    .family<TaxReportDetailResponse, TaxReportQuery>(
      (ref, query) => ref.watch(taxRepositoryProvider).reportDetails(query),
    );
