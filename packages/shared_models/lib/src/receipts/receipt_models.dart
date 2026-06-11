import '../converters/date_time_converter.dart';

enum ReceiptType {
  customerReceipt('CUSTOMER_RECEIPT'),
  taxInvoice('TAX_INVOICE'),
  duplicateCopy('DUPLICATE_COPY'),
  proformaInvoice('PROFORMA_INVOICE');

  const ReceiptType(this.wireName);
  final String wireName;
  static ReceiptType fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum ReceiptStatus {
  generated('GENERATED'),
  printed('PRINTED'),
  reprinted('REPRINTED'),
  voided('VOID');

  const ReceiptStatus(this.wireName);
  final String wireName;
  static ReceiptStatus fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

enum PrinterType {
  thermal58mm('THERMAL_58MM'),
  thermal80mm('THERMAL_80MM'),
  bluetooth('BLUETOOTH'),
  usb('USB'),
  network('NETWORK'),
  pdf('PDF'),
  mock('MOCK');

  const PrinterType(this.wireName);
  final String wireName;
  static PrinterType fromJson(Object? value) =>
      values.firstWhere((item) => item.wireName == value);
}

class ReceiptItem {
  const ReceiptItem({
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.discountAmount,
    required this.taxAmount,
    required this.taxPercentage,
    required this.lineTotal,
  });

  factory ReceiptItem.fromJson(Map<String, dynamic> json) => ReceiptItem(
    name: json['name'] as String,
    quantity: json['quantity'] as int,
    unitPrice: json['unitPrice'] as int,
    discountAmount: json['discountAmount'] as int,
    taxAmount: json['taxAmount'] as int,
    taxPercentage: (json['taxPercentage'] as num).toDouble(),
    lineTotal: json['lineTotal'] as int,
  );

  final String name;
  final int quantity;
  final int unitPrice;
  final int discountAmount;
  final int taxAmount;
  final double taxPercentage;
  final int lineTotal;
}

class ReceiptTax {
  const ReceiptTax({
    required this.name,
    required this.rate,
    required this.amount,
  });

  factory ReceiptTax.fromJson(Map<String, dynamic> json) => ReceiptTax(
    name: json['name'] as String,
    rate: (json['rate'] as num).toDouble(),
    amount: json['amount'] as int,
  );

  final String name;
  final double rate;
  final int amount;
}

class ReceiptPayment {
  const ReceiptPayment({
    required this.number,
    required this.method,
    required this.amount,
    this.referenceNumber,
  });

  factory ReceiptPayment.fromJson(Map<String, dynamic> json) => ReceiptPayment(
    number: json['number'] as String,
    method: json['method'] as String,
    amount: json['amount'] as int,
    referenceNumber: json['referenceNumber'] as String?,
  );

  final String number;
  final String method;
  final int amount;
  final String? referenceNumber;
}

class ReceiptPrintLog {
  const ReceiptPrintLog({
    required this.id,
    required this.printedByUserId,
    required this.printerName,
    required this.printerType,
    required this.copies,
    required this.isReprint,
    required this.printedAt,
  });

  factory ReceiptPrintLog.fromJson(Map<String, dynamic> json) =>
      ReceiptPrintLog(
        id: json['id'] as String,
        printedByUserId: json['printedByUserId'] as String,
        printerName: json['printerName'] as String,
        printerType: PrinterType.fromJson(json['printerType']),
        copies: json['copies'] as int,
        isReprint: json['isReprint'] as bool,
        printedAt: DateTimeConverter.fromJson(
          json['printedAt'],
          field: 'printedAt',
        ),
      );

  final String id;
  final String printedByUserId;
  final String printerName;
  final PrinterType printerType;
  final int copies;
  final bool isReprint;
  final DateTime printedAt;
}

class Receipt {
  const Receipt({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.billId,
    required this.receiptNumber,
    required this.receiptType,
    required this.status,
    required this.printablePayload,
    required this.verificationCode,
    required this.qrPayload,
    required this.printCount,
    required this.generatedByUserId,
    required this.generatedAt,
    required this.version,
    required this.printLogs,
    this.paymentId,
    this.invoiceNumber,
    this.lastPrintedAt,
    this.pdfUrl,
  });

  factory Receipt.fromJson(Map<String, dynamic> json) => Receipt(
    id: json['id'] as String,
    tenantId: json['tenantId'] as String,
    outletId: json['outletId'] as String,
    billId: json['billId'] as String,
    paymentId: json['paymentId'] as String?,
    receiptNumber: json['receiptNumber'] as String,
    invoiceNumber: json['invoiceNumber'] as String?,
    receiptType: ReceiptType.fromJson(json['receiptType']),
    status: ReceiptStatus.fromJson(json['status']),
    printablePayload: json['printablePayload'] as Map<String, dynamic>,
    verificationCode: json['verificationCode'] as String,
    qrPayload: json['qrPayload'] as String,
    printCount: json['printCount'] as int,
    lastPrintedAt: DateTimeConverter.nullableFromJson(
      json['lastPrintedAt'],
      field: 'lastPrintedAt',
    ),
    pdfUrl: json['pdfUrl'] as String?,
    generatedByUserId: json['generatedByUserId'] as String,
    generatedAt: DateTimeConverter.fromJson(
      json['generatedAt'],
      field: 'generatedAt',
    ),
    version: json['version'] as int,
    printLogs: (json['printLogs'] as List<dynamic>)
        .map((item) => ReceiptPrintLog.fromJson(item as Map<String, dynamic>))
        .toList(growable: false),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String billId;
  final String? paymentId;
  final String receiptNumber;
  final String? invoiceNumber;
  final ReceiptType receiptType;
  final ReceiptStatus status;
  final Map<String, dynamic> printablePayload;
  final String verificationCode;
  final String qrPayload;
  final int printCount;
  final DateTime? lastPrintedAt;
  final String? pdfUrl;
  final String generatedByUserId;
  final DateTime generatedAt;
  final int version;
  final List<ReceiptPrintLog> printLogs;

  Map<String, dynamic> get outlet =>
      printablePayload['outlet'] as Map<String, dynamic>;
  Map<String, dynamic> get bill =>
      printablePayload['bill'] as Map<String, dynamic>;
  Map<String, dynamic> get customer =>
      printablePayload['customer'] as Map<String, dynamic>;
  List<ReceiptItem> get items => (bill['items'] as List<dynamic>)
      .map((item) => ReceiptItem.fromJson(item as Map<String, dynamic>))
      .toList(growable: false);
  List<ReceiptTax> get taxes => (bill['taxes'] as List<dynamic>)
      .map((item) => ReceiptTax.fromJson(item as Map<String, dynamic>))
      .toList(growable: false);
  List<ReceiptPayment> get payments => (bill['payments'] as List<dynamic>)
      .map((item) => ReceiptPayment.fromJson(item as Map<String, dynamic>))
      .toList(growable: false);
  Map<String, dynamic> get summary => bill['summary'] as Map<String, dynamic>;
}

class PrintableReceipt {
  const PrintableReceipt({
    required this.receipt,
    required this.outlet,
    required this.customer,
    required this.bill,
    required this.footer,
  });

  factory PrintableReceipt.fromJson(Map<String, dynamic> json) =>
      PrintableReceipt(
        receipt: json['receipt'] as Map<String, dynamic>,
        outlet: json['outlet'] as Map<String, dynamic>,
        customer: json['customer'] as Map<String, dynamic>,
        bill: json['bill'] as Map<String, dynamic>,
        footer: json['footer'] as Map<String, dynamic>,
      );

  final Map<String, dynamic> receipt;
  final Map<String, dynamic> outlet;
  final Map<String, dynamic> customer;
  final Map<String, dynamic> bill;
  final Map<String, dynamic> footer;
}
