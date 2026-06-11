class MenuQuery {
  const MenuQuery({
    this.page = 1,
    this.limit = 20,
    this.search = '',
    this.categoryId,
  });

  final int page;
  final int limit;
  final String search;
  final String? categoryId;
}
