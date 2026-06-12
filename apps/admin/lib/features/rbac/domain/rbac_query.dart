class RbacUserQuery {
  const RbacUserQuery({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.roleId,
    this.outletId,
    this.tenantId,
  });

  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? roleId;
  final String? outletId;
  final String? tenantId;

  @override
  bool operator ==(Object other) =>
      other is RbacUserQuery &&
      page == other.page &&
      limit == other.limit &&
      search == other.search &&
      status == other.status &&
      roleId == other.roleId &&
      outletId == other.outletId &&
      tenantId == other.tenantId;

  @override
  int get hashCode =>
      Object.hash(page, limit, search, status, roleId, outletId, tenantId);
}
