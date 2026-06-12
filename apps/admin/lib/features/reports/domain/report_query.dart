class ReportQuery {
  const ReportQuery({
    this.tenantId,
    this.outletId,
    this.fromDate,
    this.toDate,
    this.businessDate,
  });
  final String? tenantId;
  final String? outletId;
  final DateTime? fromDate;
  final DateTime? toDate;
  final DateTime? businessDate;

  Map<String, dynamic> toJson() => {
    if (tenantId != null) 'tenantId': tenantId,
    if (outletId != null) 'outletId': outletId,
    if (fromDate != null) 'fromDate': _date(fromDate!),
    if (toDate != null) 'toDate': _date(toDate!),
    if (businessDate != null) 'businessDate': _date(businessDate!),
  };

  String _date(DateTime value) =>
      value.toUtc().toIso8601String().substring(0, 10);
}
