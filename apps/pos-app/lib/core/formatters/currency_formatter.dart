abstract final class CurrencyFormatter {
  static String inr(int amountMinor) {
    final amount = amountMinor / 100;
    final decimals = amountMinor % 100 == 0 ? 0 : 2;
    return 'INR ${amount.toStringAsFixed(decimals)}';
  }
}
