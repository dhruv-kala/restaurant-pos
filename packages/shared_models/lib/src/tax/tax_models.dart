enum TaxProfileStatus {
  active,
  inactive;

  factory TaxProfileStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => TaxProfileStatus.active,
    'INACTIVE' => TaxProfileStatus.inactive,
    _ => throw FormatException('Unsupported tax profile status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum TaxType {
  gst,
  vat,
  serviceTax,
  zeroRated,
  exempt;

  factory TaxType.fromJson(Object? value) => switch (value) {
    'GST' => TaxType.gst,
    'VAT' => TaxType.vat,
    'SERVICE_TAX' => TaxType.serviceTax,
    'ZERO_RATED' => TaxType.zeroRated,
    'EXEMPT' => TaxType.exempt,
    _ => throw FormatException('Unsupported tax type: $value'),
  };

  String get wireName => switch (this) {
    TaxType.gst => 'GST',
    TaxType.vat => 'VAT',
    TaxType.serviceTax => 'SERVICE_TAX',
    TaxType.zeroRated => 'ZERO_RATED',
    TaxType.exempt => 'EXEMPT',
  };
}

enum TaxMode {
  inclusive,
  exclusive,
  exempt,
  zeroRated;

  factory TaxMode.fromJson(Object? value) => switch (value) {
    'INCLUSIVE' => TaxMode.inclusive,
    'EXCLUSIVE' => TaxMode.exclusive,
    'EXEMPT' => TaxMode.exempt,
    'ZERO_RATED' => TaxMode.zeroRated,
    _ => throw FormatException('Unsupported tax mode: $value'),
  };

  String get wireName => switch (this) {
    TaxMode.inclusive => 'INCLUSIVE',
    TaxMode.exclusive => 'EXCLUSIVE',
    TaxMode.exempt => 'EXEMPT',
    TaxMode.zeroRated => 'ZERO_RATED',
  };
}

enum TaxRateStatus {
  active,
  inactive;

  factory TaxRateStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => TaxRateStatus.active,
    'INACTIVE' => TaxRateStatus.inactive,
    _ => throw FormatException('Unsupported tax rate status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum TaxGroupStatus {
  active,
  inactive;

  factory TaxGroupStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => TaxGroupStatus.active,
    'INACTIVE' => TaxGroupStatus.inactive,
    _ => throw FormatException('Unsupported tax group status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum TaxRuleStatus {
  active,
  inactive;

  factory TaxRuleStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => TaxRuleStatus.active,
    'INACTIVE' => TaxRuleStatus.inactive,
    _ => throw FormatException('Unsupported tax rule status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum TaxComponent {
  gst,
  cgst,
  sgst,
  igst,
  vat,
  serviceTax,
  cess;

  factory TaxComponent.fromJson(Object? value) => switch (value) {
    'GST' => TaxComponent.gst,
    'CGST' => TaxComponent.cgst,
    'SGST' => TaxComponent.sgst,
    'IGST' => TaxComponent.igst,
    'VAT' => TaxComponent.vat,
    'SERVICE_TAX' => TaxComponent.serviceTax,
    'CESS' => TaxComponent.cess,
    _ => throw FormatException('Unsupported tax component: $value'),
  };

  String get wireName => switch (this) {
    TaxComponent.gst => 'GST',
    TaxComponent.cgst => 'CGST',
    TaxComponent.sgst => 'SGST',
    TaxComponent.igst => 'IGST',
    TaxComponent.vat => 'VAT',
    TaxComponent.serviceTax => 'SERVICE_TAX',
    TaxComponent.cess => 'CESS',
  };
}

enum TaxMappingTarget {
  tenantDefault,
  category,
  item;

  factory TaxMappingTarget.fromJson(Object? value) => switch (value) {
    'TENANT_DEFAULT' => TaxMappingTarget.tenantDefault,
    'CATEGORY' => TaxMappingTarget.category,
    'ITEM' => TaxMappingTarget.item,
    _ => throw FormatException('Unsupported tax mapping target: $value'),
  };

  String get wireName => switch (this) {
    TaxMappingTarget.tenantDefault => 'TENANT_DEFAULT',
    TaxMappingTarget.category => 'CATEGORY',
    TaxMappingTarget.item => 'ITEM',
  };
}

enum FiscalPolicyStatus {
  active,
  inactive;

  factory FiscalPolicyStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => FiscalPolicyStatus.active,
    'INACTIVE' => FiscalPolicyStatus.inactive,
    _ => throw FormatException('Unsupported fiscal policy status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum FiscalInvoiceSequenceStatus {
  active,
  closed;

  factory FiscalInvoiceSequenceStatus.fromJson(Object? value) =>
      switch (value) {
        'ACTIVE' => FiscalInvoiceSequenceStatus.active,
        'CLOSED' => FiscalInvoiceSequenceStatus.closed,
        _ => throw FormatException(
          'Unsupported fiscal sequence status: $value',
        ),
      };

  String get wireName => name.toUpperCase();
}

class TaxProfile {
  const TaxProfile({
    required this.id,
    required this.tenantId,
    required this.code,
    required this.name,
    required this.taxType,
    required this.taxMode,
    required this.countryCode,
    required this.currencyCode,
    required this.isDefault,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.description,
  });

  factory TaxProfile.fromJson(Map<String, dynamic> json) => TaxProfile(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    code: _string(json, 'code'),
    name: _string(json, 'name'),
    description: json['description']?.toString(),
    taxType: TaxType.fromJson(json['taxType']),
    taxMode: TaxMode.fromJson(json['taxMode']),
    countryCode: _string(json, 'countryCode'),
    currencyCode: _string(json, 'currencyCode'),
    isDefault: _bool(json, 'isDefault'),
    status: TaxProfileStatus.fromJson(json['status']),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String code;
  final String name;
  final String? description;
  final TaxType taxType;
  final TaxMode taxMode;
  final String countryCode;
  final String currencyCode;
  final bool isDefault;
  final TaxProfileStatus status;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class TaxRate {
  const TaxRate({
    required this.id,
    required this.tenantId,
    required this.profileId,
    required this.code,
    required this.name,
    required this.component,
    required this.taxType,
    required this.rateBps,
    required this.status,
    required this.effectiveFrom,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.effectiveTo,
    this.sortOrder,
  });

  factory TaxRate.fromJson(Map<String, dynamic> json) => TaxRate(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    profileId: _string(json, 'profileId'),
    code: _string(json, 'code'),
    name: _string(json, 'name'),
    description: json['description']?.toString(),
    component: TaxComponent.fromJson(json['component']),
    taxType: TaxType.fromJson(json['taxType']),
    rateBps: _int(json, 'rateBps'),
    status: TaxRateStatus.fromJson(json['status']),
    effectiveFrom: _date(json, 'effectiveFrom'),
    effectiveTo: _optionalDate(json['effectiveTo']),
    sortOrder: _optionalInt(json['sortOrder']),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String profileId;
  final String code;
  final String name;
  final String? description;
  final TaxComponent component;
  final TaxType taxType;
  final int rateBps;
  final TaxRateStatus status;
  final DateTime effectiveFrom;
  final DateTime? effectiveTo;
  final int? sortOrder;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;

  double get percentage => rateBps / 100;
}

class TaxGroup {
  const TaxGroup({
    required this.id,
    required this.tenantId,
    required this.profileId,
    required this.code,
    required this.name,
    required this.status,
    required this.effectiveFrom,
    required this.rates,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.effectiveTo,
  });

  factory TaxGroup.fromJson(Map<String, dynamic> json) => TaxGroup(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    profileId: _string(json, 'profileId'),
    code: _string(json, 'code'),
    name: _string(json, 'name'),
    description: json['description']?.toString(),
    status: TaxGroupStatus.fromJson(json['status']),
    effectiveFrom: _date(json, 'effectiveFrom'),
    effectiveTo: _optionalDate(json['effectiveTo']),
    rates: _list(json['rates'], TaxRate.fromJson),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String profileId;
  final String code;
  final String name;
  final String? description;
  final TaxGroupStatus status;
  final DateTime effectiveFrom;
  final DateTime? effectiveTo;
  final List<TaxRate> rates;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;

  int get totalRateBps => rates.fold<int>(0, (sum, rate) => sum + rate.rateBps);
}

class TaxRule {
  const TaxRule({
    required this.id,
    required this.tenantId,
    required this.profileId,
    required this.taxGroupId,
    required this.code,
    required this.name,
    required this.priority,
    required this.status,
    required this.effectiveFrom,
    required this.taxGroup,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.effectiveTo,
  });

  factory TaxRule.fromJson(Map<String, dynamic> json) => TaxRule(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    profileId: _string(json, 'profileId'),
    taxGroupId: _string(json, 'taxGroupId'),
    code: _string(json, 'code'),
    name: _string(json, 'name'),
    description: json['description']?.toString(),
    priority: _int(json, 'priority'),
    status: TaxRuleStatus.fromJson(json['status']),
    effectiveFrom: _date(json, 'effectiveFrom'),
    effectiveTo: _optionalDate(json['effectiveTo']),
    taxGroup: TaxGroup.fromJson(_map(json['taxGroup'])),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String profileId;
  final String taxGroupId;
  final String code;
  final String name;
  final String? description;
  final int priority;
  final TaxRuleStatus status;
  final DateTime effectiveFrom;
  final DateTime? effectiveTo;
  final TaxGroup taxGroup;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class TaxCategoryMapping {
  const TaxCategoryMapping({
    required this.id,
    required this.tenantId,
    required this.taxRuleId,
    required this.target,
    required this.effectiveFrom,
    required this.isActive,
    required this.taxRule,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.menuCategoryId,
    this.menuItemId,
    this.effectiveTo,
  });

  factory TaxCategoryMapping.fromJson(Map<String, dynamic> json) =>
      TaxCategoryMapping(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        taxRuleId: _string(json, 'taxRuleId'),
        target: TaxMappingTarget.fromJson(json['target']),
        menuCategoryId: json['menuCategoryId']?.toString(),
        menuItemId: json['menuItemId']?.toString(),
        effectiveFrom: _date(json, 'effectiveFrom'),
        effectiveTo: _optionalDate(json['effectiveTo']),
        isActive: _bool(json, 'isActive'),
        taxRule: TaxRule.fromJson(_map(json['taxRule'])),
        version: _int(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String taxRuleId;
  final TaxMappingTarget target;
  final String? menuCategoryId;
  final String? menuItemId;
  final DateTime effectiveFrom;
  final DateTime? effectiveTo;
  final bool isActive;
  final TaxRule taxRule;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class OutletFiscalPolicy {
  const OutletFiscalPolicy({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.invoicePrefix,
    required this.invoicePadding,
    required this.fiscalYearStartMonth,
    required this.fiscalYearStartDay,
    required this.timezone,
    required this.status,
    required this.effectiveFrom,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.taxProfileId,
    this.effectiveTo,
  });

  factory OutletFiscalPolicy.fromJson(Map<String, dynamic> json) =>
      OutletFiscalPolicy(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        taxProfileId: json['taxProfileId']?.toString(),
        invoicePrefix: _string(json, 'invoicePrefix'),
        invoicePadding: _int(json, 'invoicePadding'),
        fiscalYearStartMonth: _int(json, 'fiscalYearStartMonth'),
        fiscalYearStartDay: _int(json, 'fiscalYearStartDay'),
        timezone: _string(json, 'timezone'),
        status: FiscalPolicyStatus.fromJson(json['status']),
        effectiveFrom: _date(json, 'effectiveFrom'),
        effectiveTo: _optionalDate(json['effectiveTo']),
        version: _int(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String? taxProfileId;
  final String invoicePrefix;
  final int invoicePadding;
  final int fiscalYearStartMonth;
  final int fiscalYearStartDay;
  final String timezone;
  final FiscalPolicyStatus status;
  final DateTime effectiveFrom;
  final DateTime? effectiveTo;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class FiscalInvoiceSequence {
  const FiscalInvoiceSequence({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.fiscalPolicyId,
    required this.fiscalYearLabel,
    required this.prefix,
    required this.padding,
    required this.lastNumber,
    required this.status,
    required this.startsAt,
    required this.endsAt,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FiscalInvoiceSequence.fromJson(Map<String, dynamic> json) =>
      FiscalInvoiceSequence(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        fiscalPolicyId: _string(json, 'fiscalPolicyId'),
        fiscalYearLabel: _string(json, 'fiscalYearLabel'),
        prefix: _string(json, 'prefix'),
        padding: _int(json, 'padding'),
        lastNumber: _int(json, 'lastNumber'),
        status: FiscalInvoiceSequenceStatus.fromJson(json['status']),
        startsAt: _date(json, 'startsAt'),
        endsAt: _date(json, 'endsAt'),
        version: _int(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String fiscalPolicyId;
  final String fiscalYearLabel;
  final String prefix;
  final int padding;
  final int lastNumber;
  final FiscalInvoiceSequenceStatus status;
  final DateTime startsAt;
  final DateTime endsAt;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class TaxComponentTotal {
  const TaxComponentTotal({
    required this.taxName,
    required this.taxRate,
    required this.taxAmount,
  });

  factory TaxComponentTotal.fromJson(Map<String, dynamic> json) =>
      TaxComponentTotal(
        taxName: _string(json, 'taxName'),
        taxRate: _number(json, 'taxRate'),
        taxAmount: _int(json, 'taxAmount'),
      );

  final String taxName;
  final double taxRate;
  final int taxAmount;
}

class TaxOutletTotal {
  const TaxOutletTotal({
    required this.outletId,
    required this.outletCode,
    required this.outletName,
    required this.invoiceCount,
    required this.taxableAmount,
    required this.taxAmount,
    required this.totalAmount,
  });

  factory TaxOutletTotal.fromJson(Map<String, dynamic> json) => TaxOutletTotal(
    outletId: _string(json, 'outletId'),
    outletCode: _string(json, 'outletCode'),
    outletName: _string(json, 'outletName'),
    invoiceCount: _int(json, 'invoiceCount'),
    taxableAmount: _int(json, 'taxableAmount'),
    taxAmount: _int(json, 'taxAmount'),
    totalAmount: _int(json, 'totalAmount'),
  );

  final String outletId;
  final String outletCode;
  final String outletName;
  final int invoiceCount;
  final int taxableAmount;
  final int taxAmount;
  final int totalAmount;
}

class TaxCurrencyTotal {
  const TaxCurrencyTotal({
    required this.currencyCode,
    required this.invoiceCount,
    required this.taxableAmount,
    required this.taxAmount,
    required this.totalAmount,
  });

  factory TaxCurrencyTotal.fromJson(Map<String, dynamic> json) =>
      TaxCurrencyTotal(
        currencyCode: _string(json, 'currencyCode'),
        invoiceCount: _int(json, 'invoiceCount'),
        taxableAmount: _int(json, 'taxableAmount'),
        taxAmount: _int(json, 'taxAmount'),
        totalAmount: _int(json, 'totalAmount'),
      );

  final String currencyCode;
  final int invoiceCount;
  final int taxableAmount;
  final int taxAmount;
  final int totalAmount;
}

class TaxReportSummary {
  const TaxReportSummary({
    required this.tenantId,
    required this.fromDate,
    required this.toDate,
    required this.invoiceCount,
    required this.taxInvoiceCount,
    required this.taxableAmount,
    required this.taxCollectedAmount,
    required this.totalAmount,
    required this.components,
    required this.outlets,
    required this.currencies,
    this.outletId,
  });

  factory TaxReportSummary.fromJson(Map<String, dynamic> json) =>
      TaxReportSummary(
        tenantId: _string(json, 'tenantId'),
        outletId: json['outletId']?.toString(),
        fromDate: _date(json, 'fromDate'),
        toDate: _date(json, 'toDate'),
        invoiceCount: _int(json, 'invoiceCount'),
        taxInvoiceCount: _int(json, 'taxInvoiceCount'),
        taxableAmount: _int(json, 'taxableAmount'),
        taxCollectedAmount: _int(json, 'taxCollectedAmount'),
        totalAmount: _int(json, 'totalAmount'),
        components: _list(json['components'], TaxComponentTotal.fromJson),
        outlets: _list(json['outlets'], TaxOutletTotal.fromJson),
        currencies: _list(json['currencies'], TaxCurrencyTotal.fromJson),
      );

  final String tenantId;
  final String? outletId;
  final DateTime fromDate;
  final DateTime toDate;
  final int invoiceCount;
  final int taxInvoiceCount;
  final int taxableAmount;
  final int taxCollectedAmount;
  final int totalAmount;
  final List<TaxComponentTotal> components;
  final List<TaxOutletTotal> outlets;
  final List<TaxCurrencyTotal> currencies;
}

class TaxReportDetail {
  const TaxReportDetail({
    required this.billId,
    required this.billNumber,
    required this.receiptNumbers,
    required this.businessDate,
    required this.outletId,
    required this.outletCode,
    required this.outletName,
    required this.currencyCode,
    required this.taxableAmount,
    required this.taxAmount,
    required this.totalAmount,
    required this.components,
    this.invoiceNumber,
    this.taxMode,
    this.taxProfileId,
    this.snapshotId,
  });

  factory TaxReportDetail.fromJson(Map<String, dynamic> json) =>
      TaxReportDetail(
        billId: _string(json, 'billId'),
        billNumber: _string(json, 'billNumber'),
        invoiceNumber: json['invoiceNumber']?.toString(),
        receiptNumbers: _stringList(json['receiptNumbers']),
        businessDate: _date(json, 'businessDate'),
        outletId: _string(json, 'outletId'),
        outletCode: _string(json, 'outletCode'),
        outletName: _string(json, 'outletName'),
        currencyCode: _string(json, 'currencyCode'),
        taxableAmount: _int(json, 'taxableAmount'),
        taxAmount: _int(json, 'taxAmount'),
        totalAmount: _int(json, 'totalAmount'),
        taxMode: json['taxMode']?.toString(),
        taxProfileId: json['taxProfileId']?.toString(),
        snapshotId: json['snapshotId']?.toString(),
        components: _list(json['components'], TaxComponentTotal.fromJson),
      );

  final String billId;
  final String billNumber;
  final String? invoiceNumber;
  final List<String> receiptNumbers;
  final DateTime businessDate;
  final String outletId;
  final String outletCode;
  final String outletName;
  final String currencyCode;
  final int taxableAmount;
  final int taxAmount;
  final int totalAmount;
  final String? taxMode;
  final String? taxProfileId;
  final String? snapshotId;
  final List<TaxComponentTotal> components;
}

class TaxReportDetailResponse {
  const TaxReportDetailResponse({
    required this.data,
    required this.totals,
    required this.meta,
  });

  factory TaxReportDetailResponse.fromJson(Map<String, dynamic> json) =>
      TaxReportDetailResponse(
        data: _list(json['data'], TaxReportDetail.fromJson),
        totals: TaxReportSummaryTotals.fromJson(_map(json['totals'])),
        meta: TaxPaginationMeta.fromJson(_map(json['meta'])),
      );

  final List<TaxReportDetail> data;
  final TaxReportSummaryTotals totals;
  final TaxPaginationMeta meta;
}

class TaxReportSummaryTotals {
  const TaxReportSummaryTotals({
    required this.invoiceCount,
    required this.taxInvoiceCount,
    required this.taxableAmount,
    required this.taxCollectedAmount,
    required this.totalAmount,
    required this.components,
  });

  factory TaxReportSummaryTotals.fromJson(Map<String, dynamic> json) =>
      TaxReportSummaryTotals(
        invoiceCount: _int(json, 'invoiceCount'),
        taxInvoiceCount: _int(json, 'taxInvoiceCount'),
        taxableAmount: _int(json, 'taxableAmount'),
        taxCollectedAmount: _int(json, 'taxCollectedAmount'),
        totalAmount: _int(json, 'totalAmount'),
        components: _list(json['components'], TaxComponentTotal.fromJson),
      );

  final int invoiceCount;
  final int taxInvoiceCount;
  final int taxableAmount;
  final int taxCollectedAmount;
  final int totalAmount;
  final List<TaxComponentTotal> components;
}

class TaxPaginationMeta {
  const TaxPaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  factory TaxPaginationMeta.fromJson(Map<String, dynamic> json) =>
      TaxPaginationMeta(
        page: _int(json, 'page'),
        limit: _int(json, 'limit'),
        total: _int(json, 'total'),
        totalPages: _int(json, 'totalPages'),
      );

  final int page;
  final int limit;
  final int total;
  final int totalPages;
}

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return value;
  throw FormatException('Expected string for $key.');
}

int _int(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Expected int for $key.');
}

int? _optionalInt(Object? value) => value is int ? value : null;

double _number(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is num) return value.toDouble();
  throw FormatException('Expected number for $key.');
}

bool _bool(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is bool) return value;
  throw FormatException('Expected bool for $key.');
}

DateTime _date(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return DateTime.parse(value);
  throw FormatException('Expected date string for $key.');
}

DateTime? _optionalDate(Object? value) =>
    value is String ? DateTime.parse(value) : null;

Map<String, dynamic> _map(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  throw const FormatException('Expected object.');
}

List<T> _list<T>(Object? value, T Function(Map<String, dynamic>) parser) {
  if (value is! List) throw const FormatException('Expected list.');
  return value
      .map((item) => parser(Map<String, dynamic>.from(item as Map)))
      .toList(growable: false);
}

List<String> _stringList(Object? value) {
  if (value is! List) return const <String>[];
  return value.map((item) => item.toString()).toList(growable: false);
}
