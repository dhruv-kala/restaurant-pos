import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class DeviceAdminScope {
  const DeviceAdminScope({required this.tenantId, this.outletId});

  final String tenantId;
  final String? outletId;
}

class DeviceQuery {
  const DeviceQuery({
    required this.tenantId,
    this.outletId,
    this.status,
    this.deviceType,
    this.search,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? outletId;
  final DeviceStatus? status;
  final DeviceType? deviceType;
  final String? search;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          status == other.status &&
          deviceType == other.deviceType &&
          search == other.search &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode =>
      Object.hash(tenantId, outletId, status, deviceType, search, page, limit);
}

class DeviceEnrollmentQuery {
  const DeviceEnrollmentQuery({
    required this.tenantId,
    required this.deviceId,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String deviceId;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceEnrollmentQuery &&
          tenantId == other.tenantId &&
          deviceId == other.deviceId &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(tenantId, deviceId, page, limit);
}

class TrustedSessionQuery {
  const TrustedSessionQuery({
    required this.tenantId,
    this.deviceId,
    this.userId,
    this.status,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? deviceId;
  final String? userId;
  final TrustedSessionStatus? status;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TrustedSessionQuery &&
          tenantId == other.tenantId &&
          deviceId == other.deviceId &&
          userId == other.userId &&
          status == other.status &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode =>
      Object.hash(tenantId, deviceId, userId, status, page, limit);
}

class TerminalQuery {
  const TerminalQuery({
    required this.tenantId,
    this.outletId,
    this.status,
    this.terminalType,
    this.search,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? outletId;
  final TerminalStatus? status;
  final TerminalType? terminalType;
  final String? search;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TerminalQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          status == other.status &&
          terminalType == other.terminalType &&
          search == other.search &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(
    tenantId,
    outletId,
    status,
    terminalType,
    search,
    page,
    limit,
  );
}

class DeviceAssignmentQuery {
  const DeviceAssignmentQuery({
    required this.tenantId,
    this.terminalId,
    this.deviceId,
    this.status,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? terminalId;
  final String? deviceId;
  final DeviceAssignmentStatus? status;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceAssignmentQuery &&
          tenantId == other.tenantId &&
          terminalId == other.terminalId &&
          deviceId == other.deviceId &&
          status == other.status &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode =>
      Object.hash(tenantId, terminalId, deviceId, status, page, limit);
}

class SecurityPolicyQuery {
  const SecurityPolicyQuery({
    required this.tenantId,
    this.outletId,
    this.status,
    this.page = 1,
    this.limit = 20,
  });

  final String tenantId;
  final String? outletId;
  final DeviceSecurityPolicyStatus? status;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SecurityPolicyQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          status == other.status &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(tenantId, outletId, status, page, limit);
}

class DeviceAuditQuery {
  const DeviceAuditQuery({
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
      other is DeviceAuditQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          targetType == other.targetType &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(tenantId, outletId, targetType, page, limit);
}
