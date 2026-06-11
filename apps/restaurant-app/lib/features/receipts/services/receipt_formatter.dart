import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class ReceiptFormatter {
  const ReceiptFormatter();

  String generate58mmLayout(Receipt receipt) => _format(receipt, 32);
  String generate80mmLayout(Receipt receipt) => _format(receipt, 48);

  String _format(Receipt receipt, int width) {
    final currency = receipt.bill['currencyCode'] as String;
    String money(int amount) =>
        '$currency ${(amount / 100).toStringAsFixed(2)}';
    return <String>[
      (receipt.outlet['name'] as String).toUpperCase(),
      receipt.outlet['address'] as String? ?? '',
      '-' * width,
      receipt.invoiceNumber ?? receipt.receiptNumber,
      ...receipt.items.map(
        (item) => '${item.quantity} x ${item.name} ${money(item.lineTotal)}',
      ),
      '-' * width,
      'TOTAL ${money(receipt.summary['grandTotal'] as int)}',
      ...receipt.payments.map(
        (payment) => '${payment.method} ${money(payment.amount)}',
      ),
      'Verify: ${receipt.verificationCode}',
      receipt.qrPayload,
    ].where((line) => line.isNotEmpty).join('\n');
  }
}
