class InventoryQuery {
  const InventoryQuery({
    this.page = 1,
    this.limit = 50,
    this.search,
    this.tenantId,
    this.outletId,
    this.status,
    this.alertType,
  });

  final int page;
  final int limit;
  final String? search;
  final String? tenantId;
  final String? outletId;
  final String? status;
  final String? alertType;
}
