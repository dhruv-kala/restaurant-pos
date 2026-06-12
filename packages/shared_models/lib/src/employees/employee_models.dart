enum EmploymentType {
  fullTime,
  partTime,
  contract,
  temporary,
  intern;

  static EmploymentType fromJson(String value) => switch (value) {
    'PART_TIME' => partTime,
    'CONTRACT' => contract,
    'TEMPORARY' => temporary,
    'INTERN' => intern,
    _ => fullTime,
  };
  String get wireName => switch (this) {
    fullTime => 'FULL_TIME',
    partTime => 'PART_TIME',
    contract => 'CONTRACT',
    temporary => 'TEMPORARY',
    intern => 'INTERN',
  };
}

enum EmployeeStatus {
  active,
  inactive,
  onLeave,
  terminated;

  static EmployeeStatus fromJson(String value) => switch (value) {
    'INACTIVE' => inactive,
    'ON_LEAVE' => onLeave,
    'TERMINATED' => terminated,
    _ => active,
  };
  String get wireName => switch (this) {
    active => 'ACTIVE',
    inactive => 'INACTIVE',
    onLeave => 'ON_LEAVE',
    terminated => 'TERMINATED',
  };
}

enum AttendanceStatus {
  present,
  absent,
  halfDay,
  late,
  leave;

  static AttendanceStatus fromJson(String value) => switch (value) {
    'ABSENT' => absent,
    'HALF_DAY' => halfDay,
    'LATE' => late,
    'LEAVE' => leave,
    _ => present,
  };
  String get wireName => switch (this) {
    present => 'PRESENT',
    absent => 'ABSENT',
    halfDay => 'HALF_DAY',
    late => 'LATE',
    leave => 'LEAVE',
  };
}

class EmployeeProfile {
  const EmployeeProfile({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.userId,
    required this.roleId,
    required this.employeeCode,
    required this.firstName,
    required this.dateOfJoining,
    required this.designation,
    required this.department,
    required this.employmentType,
    required this.status,
    this.lastName,
    this.phone,
    this.email,
    this.preferredLanguage = 'en',
  });
  factory EmployeeProfile.fromJson(Map<String, dynamic> json) =>
      EmployeeProfile(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        userId: _string(json, 'userId'),
        roleId: _string(json, 'roleId'),
        employeeCode: _string(json, 'employeeCode'),
        firstName: _string(json, 'firstName'),
        lastName: json['lastName'] as String?,
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        dateOfJoining: DateTime.parse(_string(json, 'dateOfJoining')),
        designation: _string(json, 'designation'),
        department: _string(json, 'department'),
        employmentType: EmploymentType.fromJson(
          _string(json, 'employmentType'),
        ),
        status: EmployeeStatus.fromJson(_string(json, 'status')),
        preferredLanguage: json['preferredLanguage'] as String? ?? 'en',
      );
  final String id;
  final String tenantId;
  final String outletId;
  final String userId;
  final String roleId;
  final String employeeCode;
  final String firstName;
  final String? lastName;
  final String? phone;
  final String? email;
  final DateTime dateOfJoining;
  final String designation;
  final String department;
  final EmploymentType employmentType;
  final EmployeeStatus status;
  final String preferredLanguage;
  String get displayName => [firstName, lastName].whereType<String>().join(' ');
}

class Shift {
  const Shift({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.name,
    required this.startTime,
    required this.endTime,
    required this.breakMinutes,
    required this.isNightShift,
    required this.isActive,
  });
  factory Shift.fromJson(Map<String, dynamic> json) => Shift(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    name: _string(json, 'name'),
    startTime: DateTime.parse(_string(json, 'startTime')),
    endTime: DateTime.parse(_string(json, 'endTime')),
    breakMinutes: _int(json, 'breakMinutes'),
    isNightShift: json['isNightShift'] as bool? ?? false,
    isActive: json['isActive'] as bool? ?? true,
  );
  final String id;
  final String tenantId;
  final String outletId;
  final String name;
  final DateTime startTime;
  final DateTime endTime;
  final int breakMinutes;
  final bool isNightShift;
  final bool isActive;
}

class Attendance {
  const Attendance({
    required this.id,
    required this.employeeId,
    required this.businessDate,
    required this.workedMinutes,
    required this.status,
    this.checkInTime,
    this.checkOutTime,
    this.remarks,
  });
  factory Attendance.fromJson(Map<String, dynamic> json) => Attendance(
    id: _string(json, 'id'),
    employeeId: _string(json, 'employeeId'),
    businessDate: DateTime.parse(_string(json, 'businessDate')),
    checkInTime: _date(json['checkInTime']),
    checkOutTime: _date(json['checkOutTime']),
    workedMinutes: _int(json, 'workedMinutes'),
    status: AttendanceStatus.fromJson(_string(json, 'status')),
    remarks: json['remarks'] as String?,
  );
  final String id;
  final String employeeId;
  final DateTime businessDate;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final int workedMinutes;
  final AttendanceStatus status;
  final String? remarks;
}

class EmployeePerformance {
  const EmployeePerformance({
    required this.id,
    required this.employeeId,
    required this.businessDate,
    required this.ordersHandled,
    required this.salesAmount,
    required this.customersServed,
    required this.averageTicketSize,
    required this.itemsProcessed,
    required this.billsProcessed,
    required this.paymentsCollected,
    required this.refundsProcessed,
    required this.averagePrepMinutes,
    required this.delayedOrders,
  });
  factory EmployeePerformance.fromJson(Map<String, dynamic> json) =>
      EmployeePerformance(
        id: _string(json, 'id'),
        employeeId: _string(json, 'employeeId'),
        businessDate: DateTime.parse(_string(json, 'businessDate')),
        ordersHandled: _int(json, 'ordersHandled'),
        salesAmount: _int(json, 'salesAmount'),
        customersServed: _int(json, 'customersServed'),
        averageTicketSize: _int(json, 'averageTicketSize'),
        itemsProcessed: _int(json, 'itemsProcessed'),
        billsProcessed: _int(json, 'billsProcessed'),
        paymentsCollected: _int(json, 'paymentsCollected'),
        refundsProcessed: _int(json, 'refundsProcessed'),
        averagePrepMinutes:
            (json['averagePrepMinutes'] as num?)?.toDouble() ?? 0,
        delayedOrders: _int(json, 'delayedOrders'),
      );
  final String id;
  final String employeeId;
  final DateTime businessDate;
  final int ordersHandled;
  final int salesAmount;
  final int customersServed;
  final int averageTicketSize;
  final int itemsProcessed;
  final int billsProcessed;
  final int paymentsCollected;
  final int refundsProcessed;
  final double averagePrepMinutes;
  final int delayedOrders;
}

class EmployeeDashboardMetrics {
  const EmployeeDashboardMetrics({
    required this.totalEmployees,
    required this.presentToday,
    required this.absentToday,
    required this.employeesOnLeave,
    required this.activeShifts,
  });
  factory EmployeeDashboardMetrics.fromJson(Map<String, dynamic> json) =>
      EmployeeDashboardMetrics(
        totalEmployees: _int(json, 'totalEmployees'),
        presentToday: _int(json, 'presentToday'),
        absentToday: _int(json, 'absentToday'),
        employeesOnLeave: _int(json, 'employeesOnLeave'),
        activeShifts: _int(json, 'activeShifts'),
      );
  final int totalEmployees;
  final int presentToday;
  final int absentToday;
  final int employeesOnLeave;
  final int activeShifts;
}

String _string(Map<String, dynamic> json, String key) =>
    json[key] as String? ?? '';
int _int(Map<String, dynamic> json, String key) =>
    (json[key] as num?)?.toInt() ?? 0;
DateTime? _date(Object? value) =>
    value is String ? DateTime.tryParse(value) : null;
