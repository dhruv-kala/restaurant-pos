class EmployeeQuery {
  const EmployeeQuery({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.outletId,
    this.department,
    this.status,
    this.shiftId,
  });
  final int page;
  final int limit;
  final String? search;
  final String? outletId;
  final String? department;
  final String? status;
  final String? shiftId;
}
