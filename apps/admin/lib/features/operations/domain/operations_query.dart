import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class OperationsScope {
  const OperationsScope({
    required this.tenantId,
    this.outletId,
    this.businessDayId,
    this.shiftSessionId,
    this.cashDrawerId,
  });

  final String tenantId;
  final String? outletId;
  final String? businessDayId;
  final String? shiftSessionId;
  final String? cashDrawerId;
}

class BusinessDayQuery {
  const BusinessDayQuery({
    required this.tenantId,
    this.outletId,
    this.status,
    this.businessDate,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? outletId;
  final BusinessDayStatus? status;
  final DateTime? businessDate;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BusinessDayQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          status == other.status &&
          businessDate == other.businessDate &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode =>
      Object.hash(tenantId, outletId, status, businessDate, page, limit);
}

class ShiftSessionQuery {
  const ShiftSessionQuery({
    required this.tenantId,
    this.outletId,
    this.businessDayId,
    this.assignedUserId,
    this.status,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? outletId;
  final String? businessDayId;
  final String? assignedUserId;
  final ShiftSessionStatus? status;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ShiftSessionQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          businessDayId == other.businessDayId &&
          assignedUserId == other.assignedUserId &&
          status == other.status &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(
    tenantId,
    outletId,
    businessDayId,
    assignedUserId,
    status,
    page,
    limit,
  );
}

class CashDrawerQuery {
  const CashDrawerQuery({
    required this.tenantId,
    this.outletId,
    this.businessDayId,
    this.shiftSessionId,
    this.status,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? outletId;
  final String? businessDayId;
  final String? shiftSessionId;
  final CashDrawerStatus? status;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CashDrawerQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          businessDayId == other.businessDayId &&
          shiftSessionId == other.shiftSessionId &&
          status == other.status &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(
    tenantId,
    outletId,
    businessDayId,
    shiftSessionId,
    status,
    page,
    limit,
  );
}

class ShiftReconciliationQuery {
  const ShiftReconciliationQuery({
    required this.tenantId,
    this.outletId,
    this.businessDayId,
    this.shiftSessionId,
    this.cashDrawerId,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? outletId;
  final String? businessDayId;
  final String? shiftSessionId;
  final String? cashDrawerId;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ShiftReconciliationQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          businessDayId == other.businessDayId &&
          shiftSessionId == other.shiftSessionId &&
          cashDrawerId == other.cashDrawerId &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(
    tenantId,
    outletId,
    businessDayId,
    shiftSessionId,
    cashDrawerId,
    page,
    limit,
  );
}

class OperationAuditQuery {
  const OperationAuditQuery({
    required this.tenantId,
    this.outletId,
    this.targetType,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? outletId;
  final String? targetType;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OperationAuditQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          targetType == other.targetType &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(tenantId, outletId, targetType, page, limit);
}
