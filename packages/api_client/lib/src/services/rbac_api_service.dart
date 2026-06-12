import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class RbacApiService {
  const RbacApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<AppUser>> getUsers({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
    String? roleId,
    String? outletId,
    String? tenantId,
  }) async => PaginatedResponse<AppUser>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.rbacUsers,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (search?.isNotEmpty ?? false) 'search': search,
          if (status != null) 'status': status,
          if (roleId != null) 'roleId': roleId,
          if (outletId != null) 'outletId': outletId,
          if (tenantId != null) 'tenantId': tenantId,
        },
      ),
    ),
    AppUser.fromJson,
  );

  Future<AppUser> getUser(String id) async => AppUser.fromJson(
    _map(await _dio.get<Object?>(ApiEndpoints.rbacUser(id))),
  );

  Future<AppUser> createUser(Map<String, dynamic> payload) async =>
      AppUser.fromJson(
        _map(await _dio.post<Object?>(ApiEndpoints.rbacUsers, data: payload)),
      );

  Future<AppUser> updateUser(String id, Map<String, dynamic> payload) async =>
      AppUser.fromJson(
        _map(
          await _dio.patch<Object?>(ApiEndpoints.rbacUser(id), data: payload),
        ),
      );

  Future<AppUser> updateUserStatus(String id, UserStatus status) async =>
      AppUser.fromJson(
        _map(
          await _dio.patch<Object?>(
            ApiEndpoints.rbacUserStatus(id),
            data: {'status': status.wireName},
          ),
        ),
      );

  Future<AppUser> inviteUser(Map<String, dynamic> payload) async =>
      AppUser.fromJson(
        _map(
          await _dio.post<Object?>(ApiEndpoints.rbacInviteUser, data: payload),
        ),
      );

  Future<Map<String, dynamic>> resetPassword(String id) async =>
      _map(await _dio.post<Object?>(ApiEndpoints.rbacUserResetPassword(id)));

  Future<PaginatedResponse<Role>> getRoles({
    int page = 1,
    int limit = 100,
    String? search,
    String? tenantId,
  }) async => PaginatedResponse<Role>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.rbacRoles,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (search?.isNotEmpty ?? false) 'search': search,
          if (tenantId != null) 'tenantId': tenantId,
        },
      ),
    ),
    Role.fromJson,
  );

  Future<Role> createRole(Map<String, dynamic> payload) async => Role.fromJson(
    _map(await _dio.post<Object?>(ApiEndpoints.rbacRoles, data: payload)),
  );

  Future<Role> updateRole(String id, Map<String, dynamic> payload) async =>
      Role.fromJson(
        _map(
          await _dio.patch<Object?>(ApiEndpoints.rbacRole(id), data: payload),
        ),
      );

  Future<void> deleteRole(String id) async =>
      _dio.delete<Object?>(ApiEndpoints.rbacRole(id));

  Future<List<Permission>> getPermissions() async => _list(
    await _dio.get<Object?>(ApiEndpoints.rbacPermissions),
    Permission.fromJson,
  );

  Future<List<PermissionGroup>> getGroupedPermissions() async {
    final groups = _map(
      await _dio.get<Object?>(ApiEndpoints.rbacGroupedPermissions),
    );
    return groups.entries
        .map(
          (entry) => PermissionGroup(
            module: entry.key,
            permissions: (entry.value as List<dynamic>)
                .map(
                  (item) => Permission.fromJson(
                    Map<String, dynamic>.from(item as Map),
                  ),
                )
                .toList(growable: false),
          ),
        )
        .toList(growable: false);
  }

  Future<List<Permission>> assignRolePermissions(
    String roleId,
    List<String> permissionIds,
  ) async => _list(
    await _dio.post<Object?>(
      ApiEndpoints.rbacRolePermissions(roleId),
      data: {'permissionIds': permissionIds},
    ),
    Permission.fromJson,
  );

  Future<List<Permission>> getRolePermissions(String roleId) async => _list(
    await _dio.get<Object?>(ApiEndpoints.rbacRolePermissions(roleId)),
    Permission.fromJson,
  );

  Future<List<Role>> assignUserRoles(
    String userId,
    List<String> roleIds,
  ) async => _list(
    await _dio.post<Object?>(
      ApiEndpoints.rbacUserRoles(userId),
      data: {'roleIds': roleIds},
    ),
    Role.fromJson,
  );

  Future<List<Role>> getUserRoles(String userId) async => _list(
    await _dio.get<Object?>(ApiEndpoints.rbacUserRoles(userId)),
    Role.fromJson,
  );

  Future<List<UserOutletAccess>> assignUserOutlets(
    String userId,
    List<String> outletIds,
  ) async => _list(
    await _dio.post<Object?>(
      ApiEndpoints.rbacUserOutlets(userId),
      data: {'outletIds': outletIds},
    ),
    UserOutletAccess.fromJson,
  );

  Future<List<UserOutletAccess>> getUserOutlets(String userId) async => _list(
    await _dio.get<Object?>(ApiEndpoints.rbacUserOutlets(userId)),
    UserOutletAccess.fromJson,
  );
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}

List<T> _list<T>(
  Response<Object?> response,
  T Function(Map<String, dynamic>) parser,
) => (response.data as List? ?? const [])
    .map((item) => parser(Map<String, dynamic>.from(item as Map)))
    .toList(growable: false);
