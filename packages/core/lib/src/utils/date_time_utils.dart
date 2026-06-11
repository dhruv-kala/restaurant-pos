abstract final class AppDateTimeUtils {
  static DateTime? tryParseUtc(Object? value) {
    if (value is! String || value.isEmpty) {
      return null;
    }
    return DateTime.tryParse(value)?.toUtc();
  }

  static String toUtcIso8601(DateTime value) => value.toUtc().toIso8601String();
}
