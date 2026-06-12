import '../enums/user_role.dart';

class AuthenticatedUser {
  const AuthenticatedUser({
    required this.id,
    required this.email,
    required this.roles,
    this.permissions = const <String>[],
    this.name,
    this.tenantId,
    this.outletId,
  });

  factory AuthenticatedUser.fromJson(Map<String, dynamic> json) {
    final rolesValue = json['roles'];
    if (rolesValue is! List<dynamic>) {
      throw const FormatException('Expected a list for "roles".');
    }
    return AuthenticatedUser(
      id: _requiredString(json, 'id'),
      email: _requiredString(json, 'email'),
      name: _optionalString(json['name']),
      tenantId: _optionalString(json['tenantId']),
      outletId: _optionalString(json['outletId']),
      roles: rolesValue
          .map<UserRole>(UserRole.fromJson)
          .toList(growable: false),
      permissions: (json['permissions'] as List<dynamic>? ?? const [])
          .map((value) => value.toString())
          .toList(growable: false),
    );
  }

  final String id;
  final String email;
  final String? name;
  final String? tenantId;
  final String? outletId;
  final List<UserRole> roles;
  final List<String> permissions;

  bool hasRole(UserRole role) => roles.contains(role);
  bool hasPermission(String permission) =>
      permissions.contains('*') || permissions.contains(permission);

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'email': email,
    'name': name,
    'tenantId': tenantId,
    'outletId': outletId,
    'roles': roles.map((role) => role.toJson()).toList(growable: false),
    'permissions': permissions,
  };
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) {
    return value;
  }
  throw FormatException('Expected a non-empty string for "$key".');
}

String? _optionalString(Object? value) {
  if (value == null || value is String) {
    return value as String?;
  }
  throw const FormatException('Expected a string or null.');
}
