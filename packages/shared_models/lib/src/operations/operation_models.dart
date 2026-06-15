enum BusinessDayStatus {
  open,
  closed;

  factory BusinessDayStatus.fromJson(Object? value) => switch (value) {
    'OPEN' => BusinessDayStatus.open,
    'CLOSED' => BusinessDayStatus.closed,
    _ => throw FormatException('Unsupported business day status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum ShiftSessionStatus {
  open,
  closed;

  factory ShiftSessionStatus.fromJson(Object? value) => switch (value) {
    'OPEN' => ShiftSessionStatus.open,
    'CLOSED' => ShiftSessionStatus.closed,
    _ => throw FormatException('Unsupported shift session status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum CashDrawerStatus {
  open,
  closed;

  factory CashDrawerStatus.fromJson(Object? value) => switch (value) {
    'OPEN' => CashDrawerStatus.open,
    'CLOSED' => CashDrawerStatus.closed,
    _ => throw FormatException('Unsupported cash drawer status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum CashDrawerTransactionType {
  openingBalance,
  cashIn,
  cashOut,
  adjustment,
  closingBalance;

  factory CashDrawerTransactionType.fromJson(Object? value) => switch (value) {
    'OPENING_BALANCE' => CashDrawerTransactionType.openingBalance,
    'CASH_IN' => CashDrawerTransactionType.cashIn,
    'CASH_OUT' => CashDrawerTransactionType.cashOut,
    'ADJUSTMENT' => CashDrawerTransactionType.adjustment,
    'CLOSING_BALANCE' => CashDrawerTransactionType.closingBalance,
    _ => throw FormatException(
      'Unsupported cash drawer transaction type: $value',
    ),
  };

  String get wireName => switch (this) {
    CashDrawerTransactionType.openingBalance => 'OPENING_BALANCE',
    CashDrawerTransactionType.cashIn => 'CASH_IN',
    CashDrawerTransactionType.cashOut => 'CASH_OUT',
    CashDrawerTransactionType.adjustment => 'ADJUSTMENT',
    CashDrawerTransactionType.closingBalance => 'CLOSING_BALANCE',
  };
}

class BusinessDay {
  const BusinessDay({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.businessDate,
    required this.status,
    required this.openedAt,
    required this.openedByUserId,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.closedAt,
    this.closedByUserId,
    this.openingNotes,
    this.closingNotes,
    this.closing,
  });

  factory BusinessDay.fromJson(Map<String, dynamic> json) => BusinessDay(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    businessDate: _date(json, 'businessDate'),
    status: BusinessDayStatus.fromJson(json['status']),
    openedAt: _date(json, 'openedAt'),
    closedAt: _optionalDate(json['closedAt']),
    openedByUserId: _string(json, 'openedByUserId'),
    closedByUserId: json['closedByUserId']?.toString(),
    openingNotes: json['openingNotes']?.toString(),
    closingNotes: json['closingNotes']?.toString(),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
    closing: json['closing'] is Map
        ? BusinessDayClosing.fromJson(_map(json['closing']))
        : null,
  );

  final String id;
  final String tenantId;
  final String outletId;
  final DateTime businessDate;
  final BusinessDayStatus status;
  final DateTime openedAt;
  final DateTime? closedAt;
  final String openedByUserId;
  final String? closedByUserId;
  final String? openingNotes;
  final String? closingNotes;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final BusinessDayClosing? closing;
}

class BusinessDayClosing {
  const BusinessDayClosing({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.businessDayId,
    required this.businessDate,
    required this.shiftSessionCount,
    required this.cashDrawerCount,
    required this.reconciliationCount,
    required this.currencyCode,
    required this.expectedCashMinor,
    required this.countedCashMinor,
    required this.varianceMinor,
    required this.closedByUserId,
    required this.closedAt,
    required this.createdAt,
    this.closingNotes,
  });

  factory BusinessDayClosing.fromJson(Map<String, dynamic> json) =>
      BusinessDayClosing(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        businessDayId: _string(json, 'businessDayId'),
        businessDate: _date(json, 'businessDate'),
        shiftSessionCount: _int(json, 'shiftSessionCount'),
        cashDrawerCount: _int(json, 'cashDrawerCount'),
        reconciliationCount: _int(json, 'reconciliationCount'),
        currencyCode: _string(json, 'currencyCode'),
        expectedCashMinor: _int(json, 'expectedCashMinor'),
        countedCashMinor: _int(json, 'countedCashMinor'),
        varianceMinor: _int(json, 'varianceMinor'),
        closedByUserId: _string(json, 'closedByUserId'),
        closingNotes: json['closingNotes']?.toString(),
        closedAt: _date(json, 'closedAt'),
        createdAt: _date(json, 'createdAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String businessDayId;
  final DateTime businessDate;
  final int shiftSessionCount;
  final int cashDrawerCount;
  final int reconciliationCount;
  final String currencyCode;
  final int expectedCashMinor;
  final int countedCashMinor;
  final int varianceMinor;
  final String closedByUserId;
  final String? closingNotes;
  final DateTime closedAt;
  final DateTime createdAt;
}

class ShiftSession {
  const ShiftSession({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.businessDayId,
    required this.assignedUserId,
    required this.status,
    required this.openedAt,
    required this.openedByUserId,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.shiftId,
    this.closedAt,
    this.closedByUserId,
    this.openingNotes,
    this.closingNotes,
  });

  factory ShiftSession.fromJson(Map<String, dynamic> json) => ShiftSession(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    businessDayId: _string(json, 'businessDayId'),
    assignedUserId: _string(json, 'assignedUserId'),
    shiftId: json['shiftId']?.toString(),
    status: ShiftSessionStatus.fromJson(json['status']),
    openedAt: _date(json, 'openedAt'),
    closedAt: _optionalDate(json['closedAt']),
    openedByUserId: _string(json, 'openedByUserId'),
    closedByUserId: json['closedByUserId']?.toString(),
    openingNotes: json['openingNotes']?.toString(),
    closingNotes: json['closingNotes']?.toString(),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String businessDayId;
  final String assignedUserId;
  final String? shiftId;
  final ShiftSessionStatus status;
  final DateTime openedAt;
  final DateTime? closedAt;
  final String openedByUserId;
  final String? closedByUserId;
  final String? openingNotes;
  final String? closingNotes;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class CashDrawer {
  const CashDrawer({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.businessDayId,
    required this.shiftSessionId,
    required this.currencyCode,
    required this.status,
    required this.openingBalanceMinor,
    required this.expectedCashMinor,
    required this.openedAt,
    required this.openedByUserId,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.closingBalanceMinor,
    this.closedAt,
    this.closedByUserId,
    this.openingNotes,
    this.closingNotes,
  });

  factory CashDrawer.fromJson(Map<String, dynamic> json) => CashDrawer(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    businessDayId: _string(json, 'businessDayId'),
    shiftSessionId: _string(json, 'shiftSessionId'),
    currencyCode: _string(json, 'currencyCode'),
    status: CashDrawerStatus.fromJson(json['status']),
    openingBalanceMinor: _int(json, 'openingBalanceMinor'),
    expectedCashMinor: _int(json, 'expectedCashMinor'),
    closingBalanceMinor: _optionalInt(json['closingBalanceMinor']),
    openedAt: _date(json, 'openedAt'),
    closedAt: _optionalDate(json['closedAt']),
    openedByUserId: _string(json, 'openedByUserId'),
    closedByUserId: json['closedByUserId']?.toString(),
    openingNotes: json['openingNotes']?.toString(),
    closingNotes: json['closingNotes']?.toString(),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String businessDayId;
  final String shiftSessionId;
  final String currencyCode;
  final CashDrawerStatus status;
  final int openingBalanceMinor;
  final int expectedCashMinor;
  final int? closingBalanceMinor;
  final DateTime openedAt;
  final DateTime? closedAt;
  final String openedByUserId;
  final String? closedByUserId;
  final String? openingNotes;
  final String? closingNotes;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class CashDrawerTransaction {
  const CashDrawerTransaction({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.businessDayId,
    required this.cashDrawerId,
    required this.transactionType,
    required this.amountMinor,
    required this.balanceAfter,
    required this.recordedByUserId,
    required this.recordedAt,
    this.note,
  });

  factory CashDrawerTransaction.fromJson(Map<String, dynamic> json) =>
      CashDrawerTransaction(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        businessDayId: _string(json, 'businessDayId'),
        cashDrawerId: _string(json, 'cashDrawerId'),
        transactionType: CashDrawerTransactionType.fromJson(
          json['transactionType'],
        ),
        amountMinor: _int(json, 'amountMinor'),
        balanceAfter: _int(json, 'balanceAfter'),
        recordedByUserId: _string(json, 'recordedByUserId'),
        note: json['note']?.toString(),
        recordedAt: _date(json, 'recordedAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String businessDayId;
  final String cashDrawerId;
  final CashDrawerTransactionType transactionType;
  final int amountMinor;
  final int balanceAfter;
  final String recordedByUserId;
  final String? note;
  final DateTime recordedAt;
}

class CashDrawerTransactionResult {
  const CashDrawerTransactionResult({
    required this.drawer,
    required this.transaction,
  });

  factory CashDrawerTransactionResult.fromJson(Map<String, dynamic> json) =>
      CashDrawerTransactionResult(
        drawer: CashDrawer.fromJson(_map(json['drawer'])),
        transaction: CashDrawerTransaction.fromJson(_map(json['transaction'])),
      );

  final CashDrawer drawer;
  final CashDrawerTransaction transaction;
}

class ShiftReconciliation {
  const ShiftReconciliation({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.businessDayId,
    required this.shiftSessionId,
    required this.cashDrawerId,
    required this.currencyCode,
    required this.expectedCashMinor,
    required this.countedCashMinor,
    required this.varianceMinor,
    required this.reconciledByUserId,
    required this.reconciledAt,
    required this.createdAt,
    this.approvalNotes,
  });

  factory ShiftReconciliation.fromJson(Map<String, dynamic> json) =>
      ShiftReconciliation(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        businessDayId: _string(json, 'businessDayId'),
        shiftSessionId: _string(json, 'shiftSessionId'),
        cashDrawerId: _string(json, 'cashDrawerId'),
        currencyCode: _string(json, 'currencyCode'),
        expectedCashMinor: _int(json, 'expectedCashMinor'),
        countedCashMinor: _int(json, 'countedCashMinor'),
        varianceMinor: _int(json, 'varianceMinor'),
        approvalNotes: json['approvalNotes']?.toString(),
        reconciledByUserId: _string(json, 'reconciledByUserId'),
        reconciledAt: _date(json, 'reconciledAt'),
        createdAt: _date(json, 'createdAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String businessDayId;
  final String shiftSessionId;
  final String cashDrawerId;
  final String currencyCode;
  final int expectedCashMinor;
  final int countedCashMinor;
  final int varianceMinor;
  final String? approvalNotes;
  final String reconciledByUserId;
  final DateTime reconciledAt;
  final DateTime createdAt;
}

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return value;
  throw FormatException('Expected string for $key.');
}

int _int(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Expected int for $key.');
}

int? _optionalInt(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return null;
}

DateTime _date(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return DateTime.parse(value);
  throw FormatException('Expected date string for $key.');
}

DateTime? _optionalDate(Object? value) =>
    value is String ? DateTime.parse(value) : null;

Map<String, dynamic> _map(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  throw const FormatException('Expected object.');
}
