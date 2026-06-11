import 'package:intl/intl.dart';

abstract final class CurrencyFormatter {
  static String inr(int amountMinor) {
    return formatMinorUnits(amountMinor, currencyCode: 'INR', locale: 'en_IN');
  }

  static String formatMinorUnits(
    int amountMinor, {
    required String currencyCode,
    String? locale,
  }) {
    final formatter = NumberFormat.currency(
      locale: locale,
      name: currencyCode,
      decimalDigits: 2,
    );
    return formatter.format(amountMinor / 100);
  }
}
