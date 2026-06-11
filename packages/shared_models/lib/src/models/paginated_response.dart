class PaginationMeta {
  const PaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      page: _requiredInt(json, 'page'),
      limit: _requiredInt(json, 'limit'),
      total: _requiredInt(json, 'total'),
      totalPages: _requiredInt(json, 'totalPages'),
    );
  }

  final int page;
  final int limit;
  final int total;
  final int totalPages;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'page': page,
    'limit': limit,
    'total': total,
    'totalPages': totalPages,
  };
}

class PaginatedResponse<T> {
  const PaginatedResponse({required this.data, required this.meta});

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic> json) itemFromJson,
  ) {
    final dataValue = json['data'];
    final metaValue = json['meta'];
    if (dataValue is! List<dynamic>) {
      throw const FormatException('Expected a list for "data".');
    }
    if (metaValue is! Map<String, dynamic>) {
      throw const FormatException('Expected an object for "meta".');
    }
    return PaginatedResponse<T>(
      data: dataValue
          .map<T>((item) {
            if (item is! Map<String, dynamic>) {
              throw const FormatException(
                'Expected each item to be an object.',
              );
            }
            return itemFromJson(item);
          })
          .toList(growable: false),
      meta: PaginationMeta.fromJson(metaValue),
    );
  }

  final List<T> data;
  final PaginationMeta meta;
}

int _requiredInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) {
    return value;
  }
  throw FormatException('Expected an integer for "$key".');
}
