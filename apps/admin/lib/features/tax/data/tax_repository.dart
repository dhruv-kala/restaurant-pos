import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/tax_query.dart';

class TaxRepository {
  const TaxRepository(this._api);
  final TaxApiService _api;

  Future<PaginatedResponse<TaxProfile>> profiles(TaxListQuery query) =>
      _api.getProfiles(
        tenantId: query.tenantId,
        page: query.page,
        limit: query.limit,
        search: query.search,
      );

  Future<TaxProfile> createProfile(String tenantId, TaxProfileDraft draft) =>
      _api.createProfile(
        tenantId: tenantId,
        code: draft.code,
        name: draft.name,
        description: draft.description,
        taxType: draft.taxType,
        taxMode: draft.taxMode,
        isDefault: draft.isDefault,
      );

  Future<TaxProfile> setProfileStatus(
    TaxProfile profile,
    TaxProfileStatus status,
  ) => _api.updateProfile(
    id: profile.id,
    tenantId: profile.tenantId,
    version: profile.version,
    status: status,
  );

  Future<PaginatedResponse<TaxRate>> rates(TaxListQuery query) => _api.getRates(
    tenantId: query.tenantId,
    profileId: query.profileId,
    page: query.page,
    limit: query.limit,
    search: query.search,
  );

  Future<TaxRate> createRate({
    required String tenantId,
    required String profileId,
    required String code,
    required String name,
    required TaxComponent component,
    required TaxType taxType,
    required int rateBps,
  }) => _api.createRate(
    tenantId: tenantId,
    profileId: profileId,
    code: code,
    name: name,
    component: component,
    taxType: taxType,
    rateBps: rateBps,
    effectiveFrom: DateTime.now().toUtc(),
  );

  Future<TaxRate> setRateStatus(TaxRate rate, TaxRateStatus status) =>
      _api.updateRateStatus(rate, status);

  Future<PaginatedResponse<TaxGroup>> groups(TaxListQuery query) =>
      _api.getGroups(
        tenantId: query.tenantId,
        profileId: query.profileId,
        page: query.page,
        limit: query.limit,
        search: query.search,
      );

  Future<TaxGroup> createGroup({
    required String tenantId,
    required String profileId,
    required String code,
    required String name,
    required List<String> rateIds,
  }) => _api.createGroup(
    tenantId: tenantId,
    profileId: profileId,
    code: code,
    name: name,
    rateIds: rateIds,
    effectiveFrom: DateTime.now().toUtc(),
  );

  Future<PaginatedResponse<TaxRule>> rules(TaxListQuery query) => _api.getRules(
    tenantId: query.tenantId,
    profileId: query.profileId,
    page: query.page,
    limit: query.limit,
    search: query.search,
  );

  Future<TaxRule> createRule({
    required String tenantId,
    required String profileId,
    required String taxGroupId,
    required String code,
    required String name,
  }) => _api.createRule(
    tenantId: tenantId,
    profileId: profileId,
    taxGroupId: taxGroupId,
    code: code,
    name: name,
    effectiveFrom: DateTime.now().toUtc(),
  );

  Future<PaginatedResponse<TaxCategoryMapping>> mappings(TaxListQuery query) =>
      _api.getMappings(
        tenantId: query.tenantId,
        profileId: query.profileId,
        page: query.page,
        limit: query.limit,
        search: query.search,
      );

  Future<TaxCategoryMapping> createMapping({
    required String tenantId,
    required String taxRuleId,
    required TaxMappingTarget target,
    String? menuCategoryId,
    String? menuItemId,
  }) => _api.createMapping(
    tenantId: tenantId,
    taxRuleId: taxRuleId,
    target: target,
    menuCategoryId: menuCategoryId,
    menuItemId: menuItemId,
    effectiveFrom: DateTime.now().toUtc(),
  );

  Future<PaginatedResponse<OutletFiscalPolicy>> fiscalPolicies(
    TaxListQuery query,
  ) => _api.getFiscalPolicies(
    tenantId: query.tenantId,
    outletId: query.outletId,
    page: query.page,
    limit: query.limit,
  );

  Future<OutletFiscalPolicy> createFiscalPolicy({
    required String tenantId,
    required String outletId,
    required String invoicePrefix,
    String? taxProfileId,
  }) => _api.createFiscalPolicy(
    tenantId: tenantId,
    outletId: outletId,
    taxProfileId: taxProfileId,
    invoicePrefix: invoicePrefix,
    timezone: 'Asia/Kolkata',
    effectiveFrom: DateTime.now().toUtc(),
  );

  Future<PaginatedResponse<FiscalInvoiceSequence>> fiscalSequences(
    TaxListQuery query,
  ) => _api.getFiscalSequences(
    tenantId: query.tenantId,
    outletId: query.outletId,
    page: query.page,
    limit: query.limit,
  );

  Future<TaxReportSummary> reportSummary(TaxReportQuery query) =>
      _api.getReportSummary(
        tenantId: query.tenantId,
        outletId: query.outletId,
        fromDate: query.fromDate,
        toDate: query.toDate,
      );

  Future<TaxReportDetailResponse> reportDetails(TaxReportQuery query) =>
      _api.getReportDetailed(
        tenantId: query.tenantId,
        outletId: query.outletId,
        fromDate: query.fromDate,
        toDate: query.toDate,
        page: query.page,
        limit: query.limit,
      );
}
