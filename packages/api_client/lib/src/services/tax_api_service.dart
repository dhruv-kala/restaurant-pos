import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class TaxApiService {
  const TaxApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<TaxProfile>> getProfiles({
    String? tenantId,
    TaxProfileStatus? status,
    TaxType? taxType,
    TaxMode? taxMode,
    bool? isDefault,
    String? search,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<TaxProfile>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxProfiles,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'status': status?.wireName,
          'taxType': taxType?.wireName,
          'taxMode': taxMode?.wireName,
          'isDefault': isDefault,
          'search': search,
          'page': page,
          'limit': limit,
        }),
      ),
    ),
    TaxProfile.fromJson,
  );

  Future<TaxProfile> createProfile({
    required String code,
    required String name,
    required TaxType taxType,
    required TaxMode taxMode,
    String? tenantId,
    String? description,
    String countryCode = 'IN',
    String currencyCode = 'INR',
    bool isDefault = false,
  }) async => TaxProfile.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.taxProfiles,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'code': code,
          'name': name,
          'description': description,
          'taxType': taxType.wireName,
          'taxMode': taxMode.wireName,
          'countryCode': countryCode,
          'currencyCode': currencyCode,
          'isDefault': isDefault,
        }),
      ),
    ),
  );

  Future<TaxProfile> updateProfile({
    required String id,
    required int version,
    String? tenantId,
    String? name,
    String? description,
    TaxType? taxType,
    TaxMode? taxMode,
    bool? isDefault,
    TaxProfileStatus? status,
  }) async => TaxProfile.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.taxProfile(id),
        queryParameters: _query(<String, Object?>{'tenantId': tenantId}),
        data: _payload(<String, Object?>{
          'version': version,
          'name': name,
          'description': description,
          'taxType': taxType?.wireName,
          'taxMode': taxMode?.wireName,
          'isDefault': isDefault,
          'status': status?.wireName,
        }),
      ),
    ),
  );

  Future<PaginatedResponse<TaxRate>> getRates({
    String? tenantId,
    String? profileId,
    String? search,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<TaxRate>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxRates,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'profileId': profileId,
          'search': search,
          'page': page,
          'limit': limit,
        }),
      ),
    ),
    TaxRate.fromJson,
  );

  Future<TaxRate> createRate({
    required String profileId,
    required String code,
    required String name,
    required TaxComponent component,
    required TaxType taxType,
    required int rateBps,
    required DateTime effectiveFrom,
    String? tenantId,
    String? description,
    DateTime? effectiveTo,
  }) async => TaxRate.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.taxRates,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'profileId': profileId,
          'code': code,
          'name': name,
          'description': description,
          'component': component.wireName,
          'taxType': taxType.wireName,
          'rateBps': rateBps,
          'effectiveFrom': _date(effectiveFrom),
          'effectiveTo': effectiveTo == null ? null : _date(effectiveTo),
        }),
      ),
    ),
  );

  Future<TaxRate> updateRateStatus(TaxRate rate, TaxRateStatus status) async =>
      TaxRate.fromJson(
        _map(
          await _dio.patch<Object?>(
            ApiEndpoints.taxRate(rate.id),
            queryParameters: _query(<String, Object?>{
              'tenantId': rate.tenantId,
            }),
            data: _payload(<String, Object?>{
              'version': rate.version,
              'status': status.wireName,
            }),
          ),
        ),
      );

  Future<PaginatedResponse<TaxGroup>> getGroups({
    String? tenantId,
    String? profileId,
    String? search,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<TaxGroup>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxGroups,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'profileId': profileId,
          'search': search,
          'page': page,
          'limit': limit,
        }),
      ),
    ),
    TaxGroup.fromJson,
  );

  Future<TaxGroup> createGroup({
    required String profileId,
    required String code,
    required String name,
    required List<String> rateIds,
    required DateTime effectiveFrom,
    String? tenantId,
    String? description,
    DateTime? effectiveTo,
  }) async => TaxGroup.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.taxGroups,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'profileId': profileId,
          'code': code,
          'name': name,
          'description': description,
          'rateIds': rateIds,
          'effectiveFrom': _date(effectiveFrom),
          'effectiveTo': effectiveTo == null ? null : _date(effectiveTo),
        }),
      ),
    ),
  );

  Future<PaginatedResponse<TaxRule>> getRules({
    String? tenantId,
    String? profileId,
    String? search,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<TaxRule>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxRules,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'profileId': profileId,
          'search': search,
          'page': page,
          'limit': limit,
        }),
      ),
    ),
    TaxRule.fromJson,
  );

  Future<TaxRule> createRule({
    required String profileId,
    required String taxGroupId,
    required String code,
    required String name,
    required DateTime effectiveFrom,
    String? tenantId,
    String? description,
    int priority = 100,
    DateTime? effectiveTo,
  }) async => TaxRule.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.taxRules,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'profileId': profileId,
          'taxGroupId': taxGroupId,
          'code': code,
          'name': name,
          'description': description,
          'priority': priority,
          'effectiveFrom': _date(effectiveFrom),
          'effectiveTo': effectiveTo == null ? null : _date(effectiveTo),
        }),
      ),
    ),
  );

  Future<PaginatedResponse<TaxCategoryMapping>> getMappings({
    String? tenantId,
    String? profileId,
    String? search,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<TaxCategoryMapping>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxCategoryMappings,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'profileId': profileId,
          'search': search,
          'page': page,
          'limit': limit,
        }),
      ),
    ),
    TaxCategoryMapping.fromJson,
  );

  Future<TaxCategoryMapping> createMapping({
    required String taxRuleId,
    required TaxMappingTarget target,
    required DateTime effectiveFrom,
    String? tenantId,
    String? menuCategoryId,
    String? menuItemId,
    DateTime? effectiveTo,
  }) async => TaxCategoryMapping.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.taxCategoryMappings,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'taxRuleId': taxRuleId,
          'target': target.wireName,
          'menuCategoryId': menuCategoryId,
          'menuItemId': menuItemId,
          'effectiveFrom': _date(effectiveFrom),
          'effectiveTo': effectiveTo == null ? null : _date(effectiveTo),
        }),
      ),
    ),
  );

  Future<PaginatedResponse<OutletFiscalPolicy>> getFiscalPolicies({
    String? tenantId,
    String? outletId,
    FiscalPolicyStatus? status,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<OutletFiscalPolicy>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxFiscalPolicies,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'outletId': outletId,
          'status': status?.wireName,
          'page': page,
          'limit': limit,
        }),
      ),
    ),
    OutletFiscalPolicy.fromJson,
  );

  Future<OutletFiscalPolicy> createFiscalPolicy({
    required String outletId,
    required String invoicePrefix,
    required String timezone,
    required DateTime effectiveFrom,
    String? tenantId,
    String? taxProfileId,
    int invoicePadding = 5,
    int fiscalYearStartMonth = 4,
    int fiscalYearStartDay = 1,
    DateTime? effectiveTo,
  }) async => OutletFiscalPolicy.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.taxFiscalPolicies,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'outletId': outletId,
          'taxProfileId': taxProfileId,
          'invoicePrefix': invoicePrefix,
          'invoicePadding': invoicePadding,
          'fiscalYearStartMonth': fiscalYearStartMonth,
          'fiscalYearStartDay': fiscalYearStartDay,
          'timezone': timezone,
          'effectiveFrom': _date(effectiveFrom),
          'effectiveTo': effectiveTo == null ? null : _date(effectiveTo),
        }),
      ),
    ),
  );

  Future<PaginatedResponse<FiscalInvoiceSequence>> getFiscalSequences({
    String? tenantId,
    String? outletId,
    String? fiscalPolicyId,
    FiscalInvoiceSequenceStatus? status,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<FiscalInvoiceSequence>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxFiscalSequences,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'outletId': outletId,
          'fiscalPolicyId': fiscalPolicyId,
          'status': status?.wireName,
          'page': page,
          'limit': limit,
        }),
      ),
    ),
    FiscalInvoiceSequence.fromJson,
  );

  Future<TaxReportSummary> getReportSummary({
    required String tenantId,
    String? outletId,
    DateTime? fromDate,
    DateTime? toDate,
  }) async => TaxReportSummary.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxReportSummary,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'outletId': outletId,
          'fromDate': fromDate == null ? null : _dateOnly(fromDate),
          'toDate': toDate == null ? null : _dateOnly(toDate),
        }),
      ),
    ),
  );

  Future<TaxReportDetailResponse> getReportDetailed({
    required String tenantId,
    String? outletId,
    DateTime? fromDate,
    DateTime? toDate,
    int page = 1,
    int limit = 20,
  }) async => TaxReportDetailResponse.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.taxReportDetailed,
        queryParameters: _query(<String, Object?>{
          'tenantId': tenantId,
          'outletId': outletId,
          'fromDate': fromDate == null ? null : _dateOnly(fromDate),
          'toDate': toDate == null ? null : _dateOnly(toDate),
          'page': page,
          'limit': limit,
        }),
      ),
    ),
  );
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}

Map<String, Object?> _query(Map<String, Object?> input) =>
    Map<String, Object?>.from(input)..removeWhere((_, value) => value == null);

Map<String, Object?> _payload(Map<String, Object?> input) =>
    Map<String, Object?>.from(input)..removeWhere((_, value) => value == null);

String _date(DateTime value) => value.toUtc().toIso8601String();

String _dateOnly(DateTime value) => value.toIso8601String().substring(0, 10);
