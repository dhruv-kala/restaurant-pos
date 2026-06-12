class CustomerQuery {
  const CustomerQuery({
    this.page = 1,
    this.limit = 50,
    this.search,
    this.status,
    this.customerType,
  });
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? customerType;
}
