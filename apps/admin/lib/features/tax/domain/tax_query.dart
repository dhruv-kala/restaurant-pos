import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class TaxUiScope {
  const TaxUiScope({required this.tenantId, this.outletId, this.profileId});

  final String tenantId;
  final String? outletId;
  final String? profileId;
}

class TaxListQuery {
  const TaxListQuery({
    required this.tenantId,
    this.outletId,
    this.profileId,
    this.page = 1,
    this.limit = 50,
    this.search,
  });

  final String tenantId;
  final String? outletId;
  final String? profileId;
  final int page;
  final int limit;
  final String? search;
}

class TaxReportQuery {
  const TaxReportQuery({
    required this.tenantId,
    this.outletId,
    this.fromDate,
    this.toDate,
    this.page = 1,
    this.limit = 25,
  });

  final String tenantId;
  final String? outletId;
  final DateTime? fromDate;
  final DateTime? toDate;
  final int page;
  final int limit;
}

class TaxProfileDraft {
  const TaxProfileDraft({
    required this.code,
    required this.name,
    required this.taxType,
    required this.taxMode,
    this.description,
    this.isDefault = false,
  });

  final String code;
  final String name;
  final TaxType taxType;
  final TaxMode taxMode;
  final String? description;
  final bool isDefault;
}
