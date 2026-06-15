enum DeviceType {
  posTerminal,
  cashierDevice,
  waiterDevice,
  kitchenDisplay,
  customerKiosk,
  tablet,
  mobileDevice,
  adminWorkstation;

  factory DeviceType.fromJson(Object? value) => switch (value) {
    'POS_TERMINAL' => DeviceType.posTerminal,
    'CASHIER_DEVICE' => DeviceType.cashierDevice,
    'WAITER_DEVICE' => DeviceType.waiterDevice,
    'KITCHEN_DISPLAY' => DeviceType.kitchenDisplay,
    'CUSTOMER_KIOSK' => DeviceType.customerKiosk,
    'TABLET' => DeviceType.tablet,
    'MOBILE_DEVICE' => DeviceType.mobileDevice,
    'ADMIN_WORKSTATION' => DeviceType.adminWorkstation,
    _ => throw FormatException('Unsupported device type: $value'),
  };

  String get wireName => switch (this) {
    DeviceType.posTerminal => 'POS_TERMINAL',
    DeviceType.cashierDevice => 'CASHIER_DEVICE',
    DeviceType.waiterDevice => 'WAITER_DEVICE',
    DeviceType.kitchenDisplay => 'KITCHEN_DISPLAY',
    DeviceType.customerKiosk => 'CUSTOMER_KIOSK',
    DeviceType.tablet => 'TABLET',
    DeviceType.mobileDevice => 'MOBILE_DEVICE',
    DeviceType.adminWorkstation => 'ADMIN_WORKSTATION',
  };
}

enum DeviceStatus {
  pending,
  active,
  disabled,
  revoked;

  factory DeviceStatus.fromJson(Object? value) => switch (value) {
    'PENDING' => DeviceStatus.pending,
    'ACTIVE' => DeviceStatus.active,
    'DISABLED' => DeviceStatus.disabled,
    'REVOKED' => DeviceStatus.revoked,
    _ => throw FormatException('Unsupported device status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum DeviceEnrollmentStatus {
  requested,
  approved,
  activated,
  expired,
  cancelled;

  factory DeviceEnrollmentStatus.fromJson(Object? value) => switch (value) {
    'REQUESTED' => DeviceEnrollmentStatus.requested,
    'APPROVED' => DeviceEnrollmentStatus.approved,
    'ACTIVATED' => DeviceEnrollmentStatus.activated,
    'EXPIRED' => DeviceEnrollmentStatus.expired,
    'CANCELLED' => DeviceEnrollmentStatus.cancelled,
    _ => throw FormatException('Unsupported enrollment status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum TrustedSessionStatus {
  active,
  expired,
  revoked;

  factory TrustedSessionStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => TrustedSessionStatus.active,
    'EXPIRED' => TrustedSessionStatus.expired,
    'REVOKED' => TrustedSessionStatus.revoked,
    _ => throw FormatException('Unsupported trusted session status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum TerminalType {
  posCounter,
  cashierStation,
  kitchenScreen,
  waiterStation,
  customerKiosk;

  factory TerminalType.fromJson(Object? value) => switch (value) {
    'POS_COUNTER' => TerminalType.posCounter,
    'CASHIER_STATION' => TerminalType.cashierStation,
    'KITCHEN_SCREEN' => TerminalType.kitchenScreen,
    'WAITER_STATION' => TerminalType.waiterStation,
    'CUSTOMER_KIOSK' => TerminalType.customerKiosk,
    _ => throw FormatException('Unsupported terminal type: $value'),
  };

  String get wireName => switch (this) {
    TerminalType.posCounter => 'POS_COUNTER',
    TerminalType.cashierStation => 'CASHIER_STATION',
    TerminalType.kitchenScreen => 'KITCHEN_SCREEN',
    TerminalType.waiterStation => 'WAITER_STATION',
    TerminalType.customerKiosk => 'CUSTOMER_KIOSK',
  };
}

enum TerminalStatus {
  active,
  inactive;

  factory TerminalStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => TerminalStatus.active,
    'INACTIVE' => TerminalStatus.inactive,
    _ => throw FormatException('Unsupported terminal status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum DeviceAssignmentStatus {
  active,
  ended;

  factory DeviceAssignmentStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => DeviceAssignmentStatus.active,
    'ENDED' => DeviceAssignmentStatus.ended,
    _ => throw FormatException('Unsupported device assignment status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum DeviceSecurityPolicyStatus {
  active,
  inactive;

  factory DeviceSecurityPolicyStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => DeviceSecurityPolicyStatus.active,
    'INACTIVE' => DeviceSecurityPolicyStatus.inactive,
    _ => throw FormatException('Unsupported security policy status: $value'),
  };

  String get wireName => name.toUpperCase();
}

class Device {
  const Device({
    required this.id,
    required this.tenantId,
    required this.deviceIdentifier,
    required this.name,
    required this.deviceType,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.outletId,
    this.platform,
    this.manufacturer,
    this.model,
    this.osVersion,
    this.appVersion,
    this.serialNumber,
    this.lastSeenAt,
    this.metadata,
  });

  factory Device.fromJson(Map<String, dynamic> json) => Device(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: json['outletId']?.toString(),
    deviceIdentifier: _string(json, 'deviceIdentifier'),
    name: _string(json, 'name'),
    deviceType: DeviceType.fromJson(json['deviceType']),
    status: DeviceStatus.fromJson(json['status']),
    platform: json['platform']?.toString(),
    manufacturer: json['manufacturer']?.toString(),
    model: json['model']?.toString(),
    osVersion: json['osVersion']?.toString(),
    appVersion: json['appVersion']?.toString(),
    serialNumber: json['serialNumber']?.toString(),
    lastSeenAt: _optionalDate(json['lastSeenAt']),
    metadata: _optionalMap(json['metadata']),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String? outletId;
  final String deviceIdentifier;
  final String name;
  final DeviceType deviceType;
  final DeviceStatus status;
  final String? platform;
  final String? manufacturer;
  final String? model;
  final String? osVersion;
  final String? appVersion;
  final String? serialNumber;
  final DateTime? lastSeenAt;
  final Map<String, dynamic>? metadata;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class DeviceEnrollment {
  const DeviceEnrollment({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.status,
    required this.activationCodeMasked,
    required this.expiresAt,
    required this.requestedByUserId,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.approvedByUserId,
    this.approvedAt,
    this.activatedAt,
    this.activationCode,
  });

  factory DeviceEnrollment.fromJson(Map<String, dynamic> json) =>
      DeviceEnrollment(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        deviceId: _string(json, 'deviceId'),
        status: DeviceEnrollmentStatus.fromJson(json['status']),
        activationCodeMasked: _string(json, 'activationCodeMasked'),
        expiresAt: _date(json, 'expiresAt'),
        requestedByUserId: _string(json, 'requestedByUserId'),
        approvedByUserId: json['approvedByUserId']?.toString(),
        approvedAt: _optionalDate(json['approvedAt']),
        activatedAt: _optionalDate(json['activatedAt']),
        activationCode: json['activationCode']?.toString(),
        version: _int(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final DeviceEnrollmentStatus status;
  final String activationCodeMasked;
  final DateTime expiresAt;
  final String requestedByUserId;
  final String? approvedByUserId;
  final DateTime? approvedAt;
  final DateTime? activatedAt;
  final String? activationCode;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class TrustedDeviceSession {
  const TrustedDeviceSession({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.userId,
    required this.status,
    required this.sessionTokenMasked,
    required this.trustedAt,
    required this.expiresAt,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.lastRenewedAt,
    this.revokedAt,
    this.revokedByUserId,
    this.revocationReason,
    this.userAgent,
    this.ipAddress,
    this.sessionToken,
  });

  factory TrustedDeviceSession.fromJson(Map<String, dynamic> json) =>
      TrustedDeviceSession(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        deviceId: _string(json, 'deviceId'),
        userId: _string(json, 'userId'),
        status: TrustedSessionStatus.fromJson(json['status']),
        sessionTokenMasked: _string(json, 'sessionTokenMasked'),
        trustedAt: _date(json, 'trustedAt'),
        lastRenewedAt: _optionalDate(json['lastRenewedAt']),
        expiresAt: _date(json, 'expiresAt'),
        revokedAt: _optionalDate(json['revokedAt']),
        revokedByUserId: json['revokedByUserId']?.toString(),
        revocationReason: json['revocationReason']?.toString(),
        userAgent: json['userAgent']?.toString(),
        ipAddress: json['ipAddress']?.toString(),
        sessionToken: json['sessionToken']?.toString(),
        version: _int(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final String userId;
  final TrustedSessionStatus status;
  final String sessionTokenMasked;
  final DateTime trustedAt;
  final DateTime? lastRenewedAt;
  final DateTime expiresAt;
  final DateTime? revokedAt;
  final String? revokedByUserId;
  final String? revocationReason;
  final String? userAgent;
  final String? ipAddress;
  final String? sessionToken;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class Terminal {
  const Terminal({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.terminalCode,
    required this.name,
    required this.terminalType,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.description,
  });

  factory Terminal.fromJson(Map<String, dynamic> json) => Terminal(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    terminalCode: _string(json, 'terminalCode'),
    name: _string(json, 'name'),
    terminalType: TerminalType.fromJson(json['terminalType']),
    status: TerminalStatus.fromJson(json['status']),
    description: json['description']?.toString(),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String terminalCode;
  final String name;
  final TerminalType terminalType;
  final TerminalStatus status;
  final String? description;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class DeviceAssignment {
  const DeviceAssignment({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.terminalId,
    required this.deviceId,
    required this.status,
    required this.assignedAt,
    required this.assignedByUserId,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.endedAt,
    this.endedByUserId,
    this.endReason,
  });

  factory DeviceAssignment.fromJson(Map<String, dynamic> json) =>
      DeviceAssignment(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        terminalId: _string(json, 'terminalId'),
        deviceId: _string(json, 'deviceId'),
        status: DeviceAssignmentStatus.fromJson(json['status']),
        assignedAt: _date(json, 'assignedAt'),
        assignedByUserId: _string(json, 'assignedByUserId'),
        endedAt: _optionalDate(json['endedAt']),
        endedByUserId: json['endedByUserId']?.toString(),
        endReason: json['endReason']?.toString(),
        version: _int(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String terminalId;
  final String deviceId;
  final DeviceAssignmentStatus status;
  final DateTime assignedAt;
  final String assignedByUserId;
  final DateTime? endedAt;
  final String? endedByUserId;
  final String? endReason;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class DeviceSecurityPolicy {
  const DeviceSecurityPolicy({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.status,
    required this.requireTrustedSession,
    required this.sessionTimeoutMinutes,
    required this.allowedDeviceTypes,
    required this.createdByUserId,
    required this.updatedByUserId,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.outletId,
    this.forceLogoutBefore,
    this.restrictions,
    this.revokedSessions = 0,
  });

  factory DeviceSecurityPolicy.fromJson(Map<String, dynamic> json) =>
      DeviceSecurityPolicy(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: json['outletId']?.toString(),
        name: _string(json, 'name'),
        status: DeviceSecurityPolicyStatus.fromJson(json['status']),
        requireTrustedSession: _bool(json, 'requireTrustedSession'),
        sessionTimeoutMinutes: _int(json, 'sessionTimeoutMinutes'),
        forceLogoutBefore: _optionalDate(json['forceLogoutBefore']),
        allowedDeviceTypes: _list(
          json['allowedDeviceTypes'],
        ).map(DeviceType.fromJson).toList(growable: false),
        restrictions: _optionalMap(json['restrictions']),
        createdByUserId: _string(json, 'createdByUserId'),
        updatedByUserId: _string(json, 'updatedByUserId'),
        version: _int(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
        revokedSessions: _optionalInt(json['revokedSessions']) ?? 0,
      );

  final String id;
  final String tenantId;
  final String? outletId;
  final String name;
  final DeviceSecurityPolicyStatus status;
  final bool requireTrustedSession;
  final int sessionTimeoutMinutes;
  final DateTime? forceLogoutBefore;
  final List<DeviceType> allowedDeviceTypes;
  final Map<String, dynamic>? restrictions;
  final String createdByUserId;
  final String updatedByUserId;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int revokedSessions;
}

class EffectiveDeviceSecurityPolicy {
  const EffectiveDeviceSecurityPolicy({
    required this.deviceId,
    required this.tenantId,
    required this.policyScope,
    required this.requireTrustedSession,
    required this.sessionTimeoutMinutes,
    required this.allowedDeviceTypes,
    required this.allowedDeviceType,
    this.outletId,
    this.policyId,
    this.forceLogoutBefore,
    this.restrictions,
  });

  factory EffectiveDeviceSecurityPolicy.fromJson(Map<String, dynamic> json) =>
      EffectiveDeviceSecurityPolicy(
        deviceId: _string(json, 'deviceId'),
        tenantId: _string(json, 'tenantId'),
        outletId: json['outletId']?.toString(),
        policyId: json['policyId']?.toString(),
        policyScope: _string(json, 'policyScope'),
        requireTrustedSession: _bool(json, 'requireTrustedSession'),
        sessionTimeoutMinutes: _int(json, 'sessionTimeoutMinutes'),
        forceLogoutBefore: _optionalDate(json['forceLogoutBefore']),
        allowedDeviceTypes: _list(
          json['allowedDeviceTypes'],
        ).map(DeviceType.fromJson).toList(growable: false),
        allowedDeviceType: _bool(json, 'allowedDeviceType'),
        restrictions: _optionalMap(json['restrictions']),
      );

  final String deviceId;
  final String tenantId;
  final String? outletId;
  final String? policyId;
  final String policyScope;
  final bool requireTrustedSession;
  final int sessionTimeoutMinutes;
  final DateTime? forceLogoutBefore;
  final List<DeviceType> allowedDeviceTypes;
  final bool allowedDeviceType;
  final Map<String, dynamic>? restrictions;
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

bool _bool(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is bool) return value;
  throw FormatException('Expected bool for $key.');
}

DateTime _date(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return DateTime.parse(value);
  throw FormatException('Expected date string for $key.');
}

DateTime? _optionalDate(Object? value) =>
    value is String ? DateTime.parse(value) : null;

List<Object?> _list(Object? value) {
  if (value is List) return value;
  return const <Object?>[];
}

Map<String, dynamic>? _optionalMap(Object? value) {
  if (value == null) return null;
  if (value is Map) return Map<String, dynamic>.from(value);
  throw const FormatException('Expected object.');
}
