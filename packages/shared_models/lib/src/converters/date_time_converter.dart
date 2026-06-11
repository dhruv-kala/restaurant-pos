abstract final class DateTimeConverter {
  static DateTime fromJson(Object? value, {required String field}) {
    if (value is DateTime) {
      return value.toUtc();
    }
    if (value is String) {
      final parsed = DateTime.tryParse(value);
      if (parsed != null) {
        return parsed.toUtc();
      }
    }
    throw FormatException('Expected an ISO-8601 date for "$field".');
  }

  static DateTime? nullableFromJson(Object? value, {required String field}) {
    return value == null ? null : fromJson(value, field: field);
  }

  static String toJson(DateTime value) => value.toUtc().toIso8601String();
}
