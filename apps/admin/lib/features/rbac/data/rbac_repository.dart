import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/rbac_query.dart';

class RbacRepository {
  const RbacRepository(this._api);
  final RbacApiService _api;

  Future<PaginatedResponse<AppUser>> users(RbacUserQuery query) =>
      _api.getUsers(
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
        roleId: query.roleId,
        outletId: query.outletId,
        tenantId: query.tenantId,
      );
  Future<AppUser> user(String id) => _api.getUser(id);
  Future<AppUser> createUser(Map<String, dynamic> payload) =>
      _api.createUser(payload);
  Future<AppUser> inviteUser(Map<String, dynamic> payload) =>
      _api.inviteUser(payload);
  Future<AppUser> updateUser(String id, Map<String, dynamic> payload) =>
      _api.updateUser(id, payload);
  Future<AppUser> updateUserStatus(String id, UserStatus status) =>
      _api.updateUserStatus(id, status);
  Future<Map<String, dynamic>> resetPassword(String id) =>
      _api.resetPassword(id);
  Future<PaginatedResponse<Role>> roles() => _api.getRoles();
  Future<Role> createRole(Map<String, dynamic> payload) =>
      _api.createRole(payload);
  Future<Role> updateRole(String id, Map<String, dynamic> payload) =>
      _api.updateRole(id, payload);
  Future<void> deleteRole(String id) => _api.deleteRole(id);
  Future<List<Permission>> permissions() => _api.getPermissions();
  Future<List<PermissionGroup>> permissionGroups() =>
      _api.getGroupedPermissions();
  Future<List<Permission>> rolePermissions(String id) =>
      _api.getRolePermissions(id);
  Future<List<Permission>> assignRolePermissions(
    String id,
    List<String> permissionIds,
  ) => _api.assignRolePermissions(id, permissionIds);
  Future<List<Role>> userRoles(String id) => _api.getUserRoles(id);
  Future<List<Role>> assignUserRoles(String id, List<String> roleIds) =>
      _api.assignUserRoles(id, roleIds);
  Future<List<UserOutletAccess>> userOutlets(String id) =>
      _api.getUserOutlets(id);
  Future<List<UserOutletAccess>> assignUserOutlets(
    String id,
    List<String> outletIds,
  ) => _api.assignUserOutlets(id, outletIds);
}
