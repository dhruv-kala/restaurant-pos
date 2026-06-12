enum UserStatus {
  active,
  inactive,
  suspended,
  invited,
  revoked;

  factory UserStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => UserStatus.active,
    'INACTIVE' => UserStatus.inactive,
    'SUSPENDED' => UserStatus.suspended,
    'INVITED' => UserStatus.invited,
    'REVOKED' => UserStatus.revoked,
    _ => throw FormatException('Unsupported user status: $value'),
  };

  String get wireName => name.toUpperCase();
}

class Permission {
  const Permission({
    required this.id,
    required this.module,
    required this.action,
    required this.code,
    required this.description,
    required this.isActive,
  });

  factory Permission.fromJson(Map<String, dynamic> json) => Permission(
    id: _string(json, 'id'),
    module: _string(json, 'module'),
    action: _string(json, 'action'),
    code: _string(json, 'code'),
    description: _string(json, 'description'),
    isActive: json['isActive'] as bool? ?? true,
  );

  final String id;
  final String module;
  final String action;
  final String code;
  final String description;
  final bool isActive;
}

class Role {
  const Role({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.code,
    required this.isSystemRole,
    required this.isActive,
    this.description,
    this.assignedUsersCount = 0,
    this.assignedPermissionsCount = 0,
  });

  factory Role.fromJson(Map<String, dynamic> json) => Role(
    id: _string(json, 'id'),
    tenantId: json['tenantId']?.toString() ?? '',
    name: _string(json, 'name'),
    code: json['code']?.toString() ?? '',
    description: json['description']?.toString(),
    isSystemRole: json['isSystemRole'] as bool? ?? false,
    isActive: json['isActive'] as bool? ?? true,
    assignedUsersCount: json['assignedUsersCount'] as int? ?? 0,
    assignedPermissionsCount: json['assignedPermissionsCount'] as int? ?? 0,
  );

  final String id;
  final String tenantId;
  final String name;
  final String code;
  final String? description;
  final bool isSystemRole;
  final bool isActive;
  final int assignedUsersCount;
  final int assignedPermissionsCount;
}

class UserOutletAccess {
  const UserOutletAccess({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.code,
  });

  factory UserOutletAccess.fromJson(Map<String, dynamic> json) =>
      UserOutletAccess(
        id: _string(json, 'id'),
        tenantId: json['tenantId']?.toString() ?? '',
        name: _string(json, 'name'),
        code: _string(json, 'code'),
      );

  final String id;
  final String tenantId;
  final String name;
  final String code;
}

class AppUser {
  const AppUser({
    required this.id,
    required this.membershipId,
    required this.tenantId,
    required this.email,
    required this.name,
    required this.status,
    required this.roles,
    required this.outlets,
    required this.createdAt,
    required this.updatedAt,
    this.phone,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: _string(json, 'id'),
    membershipId: _string(json, 'membershipId'),
    tenantId: _string(json, 'tenantId'),
    email: json['email']?.toString() ?? '',
    phone: json['phone']?.toString(),
    name: _string(json, 'name'),
    status: UserStatus.fromJson(json['status']),
    roles: _maps(json['roles']).map(Role.fromJson).toList(growable: false),
    outlets: _maps(
      json['outlets'],
    ).map(UserOutletAccess.fromJson).toList(growable: false),
    createdAt: DateTime.parse(_string(json, 'createdAt')).toUtc(),
    updatedAt: DateTime.parse(_string(json, 'updatedAt')).toUtc(),
  );

  final String id;
  final String membershipId;
  final String tenantId;
  final String email;
  final String? phone;
  final String name;
  final UserStatus status;
  final List<Role> roles;
  final List<UserOutletAccess> outlets;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class RolePermission {
  const RolePermission({required this.roleId, required this.permission});
  final String roleId;
  final Permission permission;
}

class PermissionGroup {
  const PermissionGroup({required this.module, required this.permissions});
  final String module;
  final List<Permission> permissions;
}

class UserAccess {
  const UserAccess({required this.roles, required this.outlets});
  final List<Role> roles;
  final List<UserOutletAccess> outlets;
}

class UserManagementMetrics {
  const UserManagementMetrics({
    required this.totalUsers,
    required this.activeUsers,
    required this.inactiveUsers,
    required this.invitedUsers,
    required this.usersByRole,
  });

  factory UserManagementMetrics.fromUsers(List<AppUser> users) {
    final usersByRole = <String, int>{};
    for (final user in users) {
      for (final role in user.roles) {
        usersByRole.update(role.name, (value) => value + 1, ifAbsent: () => 1);
      }
    }
    return UserManagementMetrics(
      totalUsers: users.length,
      activeUsers: users
          .where((user) => user.status == UserStatus.active)
          .length,
      inactiveUsers: users
          .where(
            (user) =>
                user.status == UserStatus.inactive ||
                user.status == UserStatus.suspended,
          )
          .length,
      invitedUsers: users
          .where((user) => user.status == UserStatus.invited)
          .length,
      usersByRole: usersByRole,
    );
  }

  final int totalUsers;
  final int activeUsers;
  final int inactiveUsers;
  final int invitedUsers;
  final Map<String, int> usersByRole;
}

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Expected a non-empty string for "$key".');
}

List<Map<String, dynamic>> _maps(Object? value) =>
    (value as List<dynamic>? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);
