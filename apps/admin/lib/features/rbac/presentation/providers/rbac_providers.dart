import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/rbac_repository.dart';
import '../../domain/rbac_query.dart';

final rbacApiServiceProvider = Provider<RbacApiService>(
  (ref) => RbacApiService(ref.watch(dioProvider)),
);
final rbacRepositoryProvider = Provider<RbacRepository>(
  (ref) => RbacRepository(ref.watch(rbacApiServiceProvider)),
);
final usersProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<AppUser>, RbacUserQuery>(
      (ref, query) => ref.watch(rbacRepositoryProvider).users(query),
    );
final userDetailsProvider = FutureProvider.autoDispose.family<AppUser, String>(
  (ref, id) => ref.watch(rbacRepositoryProvider).user(id),
);
final rolesProvider = FutureProvider.autoDispose<PaginatedResponse<Role>>(
  (ref) => ref.watch(rbacRepositoryProvider).roles(),
);
final permissionsProvider = FutureProvider.autoDispose<List<Permission>>(
  (ref) => ref.watch(rbacRepositoryProvider).permissions(),
);
final permissionGroupsProvider =
    FutureProvider.autoDispose<List<PermissionGroup>>(
      (ref) => ref.watch(rbacRepositoryProvider).permissionGroups(),
    );
final userAccessProvider = FutureProvider.autoDispose
    .family<UserAccess, String>((ref, id) async {
      final repository = ref.watch(rbacRepositoryProvider);
      final results = await Future.wait<Object>([
        repository.userRoles(id),
        repository.userOutlets(id),
      ]);
      return UserAccess(
        roles: results[0] as List<Role>,
        outlets: results[1] as List<UserOutletAccess>,
      );
    });
final rolePermissionsProvider = FutureProvider.autoDispose
    .family<List<Permission>, String>(
      (ref, id) => ref.watch(rbacRepositoryProvider).rolePermissions(id),
    );
final rbacOutletsProvider = FutureProvider.autoDispose<List<Outlet>>(
  (ref) async =>
      (await OutletApiService(ref.watch(dioProvider)).list(limit: 100)).data,
);
final userManagementMetricsProvider =
    FutureProvider.autoDispose<UserManagementMetrics>((ref) async {
      final page = await ref.watch(
        usersProvider(const RbacUserQuery(limit: 100)).future,
      );
      return UserManagementMetrics.fromUsers(page.data);
    });
