import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class DeviceManagementApiService {
  const DeviceManagementApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<Device>> getDevices({
    String? tenantId,
    String? outletId,
    DeviceStatus? status,
    DeviceType? deviceType,
    String? search,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<Device>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.devices,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          status: status?.wireName,
          deviceType: deviceType?.wireName,
          search: search,
          page: page,
          limit: limit,
        ),
      ),
    ),
    Device.fromJson,
  );

  Future<Device> registerDevice({
    String? tenantId,
    String? outletId,
    required String deviceIdentifier,
    required String name,
    required DeviceType deviceType,
    String? platform,
    String? manufacturer,
    String? model,
    String? osVersion,
    String? appVersion,
    String? serialNumber,
  }) async => Device.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.devices,
        data: _payload({
          'tenantId': tenantId,
          'outletId': outletId,
          'deviceIdentifier': deviceIdentifier,
          'name': name,
          'deviceType': deviceType.wireName,
          'platform': platform,
          'manufacturer': manufacturer,
          'model': model,
          'osVersion': osVersion,
          'appVersion': appVersion,
          'serialNumber': serialNumber,
        }),
      ),
    ),
  );

  Future<Device> getDevice({String? tenantId, required String id}) async =>
      Device.fromJson(
        _map(
          await _dio.get<Object?>(
            ApiEndpoints.device(id),
            queryParameters: _payload({'tenantId': tenantId}),
          ),
        ),
      );

  Future<Device> updateDeviceStatus({
    String? tenantId,
    required String id,
    required DeviceStatus status,
    required int version,
  }) async => Device.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.deviceStatus(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: {'status': status.wireName, 'version': version},
      ),
    ),
  );

  Future<PaginatedResponse<DeviceEnrollment>> getDeviceEnrollments({
    String? tenantId,
    required String deviceId,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<DeviceEnrollment>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.deviceEnrollmentRequests(deviceId),
        queryParameters: _query(tenantId: tenantId, page: page, limit: limit),
      ),
    ),
    DeviceEnrollment.fromJson,
  );

  Future<DeviceEnrollment> requestDeviceEnrollment({
    String? tenantId,
    required String deviceId,
    int expiresInMinutes = 15,
  }) async => DeviceEnrollment.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.deviceEnrollmentRequests(deviceId),
        data: _payload({
          'tenantId': tenantId,
          'expiresInMinutes': expiresInMinutes,
        }),
      ),
    ),
  );

  Future<DeviceEnrollment> approveDeviceEnrollment({
    String? tenantId,
    required String id,
    required int version,
  }) async => DeviceEnrollment.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.deviceEnrollmentApprove(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: {'version': version},
      ),
    ),
  );

  Future<DeviceEnrollment> activateDeviceEnrollment({
    String? tenantId,
    required String deviceIdentifier,
    required String activationCode,
  }) async => DeviceEnrollment.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.deviceEnrollmentActivate,
        data: _payload({
          'tenantId': tenantId,
          'deviceIdentifier': deviceIdentifier,
          'activationCode': activationCode,
        }),
      ),
    ),
  );

  Future<PaginatedResponse<TrustedDeviceSession>> getTrustedSessions({
    String? tenantId,
    String? deviceId,
    String? userId,
    TrustedSessionStatus? status,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<TrustedDeviceSession>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.trustedSessions,
        queryParameters: _query(
          tenantId: tenantId,
          deviceId: deviceId,
          userId: userId,
          status: status?.wireName,
          page: page,
          limit: limit,
        ),
      ),
    ),
    TrustedDeviceSession.fromJson,
  );

  Future<TrustedDeviceSession> createTrustedSession({
    String? tenantId,
    required String deviceId,
    int expiresInMinutes = 1440,
  }) async => TrustedDeviceSession.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.deviceTrustedSessions(deviceId),
        data: _payload({
          'tenantId': tenantId,
          'expiresInMinutes': expiresInMinutes,
        }),
      ),
    ),
  );

  Future<TrustedDeviceSession> renewTrustedSession({
    String? tenantId,
    required String id,
    required int version,
    int expiresInMinutes = 1440,
  }) async => TrustedDeviceSession.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.trustedSessionRenew(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: {'version': version, 'expiresInMinutes': expiresInMinutes},
      ),
    ),
  );

  Future<TrustedDeviceSession> revokeTrustedSession({
    String? tenantId,
    required String id,
    required int version,
    String? reason,
  }) async => TrustedDeviceSession.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.trustedSessionRevoke(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({'version': version, 'reason': reason}),
      ),
    ),
  );

  Future<PaginatedResponse<Terminal>> getTerminals({
    String? tenantId,
    String? outletId,
    TerminalStatus? status,
    TerminalType? terminalType,
    String? search,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<Terminal>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.terminals,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          status: status?.wireName,
          terminalType: terminalType?.wireName,
          search: search,
          page: page,
          limit: limit,
        ),
      ),
    ),
    Terminal.fromJson,
  );

  Future<Terminal> createTerminal({
    String? tenantId,
    required String outletId,
    required String terminalCode,
    required String name,
    required TerminalType terminalType,
    String? description,
  }) async => Terminal.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.terminals,
        data: _payload({
          'tenantId': tenantId,
          'outletId': outletId,
          'terminalCode': terminalCode,
          'name': name,
          'terminalType': terminalType.wireName,
          'description': description,
        }),
      ),
    ),
  );

  Future<Terminal> updateTerminal({
    String? tenantId,
    required String id,
    String? name,
    TerminalStatus? status,
    String? description,
    required int version,
  }) async => Terminal.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.terminal(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({
          'name': name,
          'status': status?.wireName,
          'description': description,
          'version': version,
        }),
      ),
    ),
  );

  Future<PaginatedResponse<DeviceAssignment>> getDeviceAssignments({
    String? tenantId,
    String? terminalId,
    String? deviceId,
    DeviceAssignmentStatus? status,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<DeviceAssignment>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.deviceAssignments,
        queryParameters: _query(
          tenantId: tenantId,
          terminalId: terminalId,
          deviceId: deviceId,
          status: status?.wireName,
          page: page,
          limit: limit,
        ),
      ),
    ),
    DeviceAssignment.fromJson,
  );

  Future<DeviceAssignment> assignDeviceToTerminal({
    String? tenantId,
    required String terminalId,
    required String deviceId,
    required int terminalVersion,
  }) async => DeviceAssignment.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.terminalDeviceAssignments(terminalId),
        queryParameters: _payload({'tenantId': tenantId}),
        data: {'deviceId': deviceId, 'terminalVersion': terminalVersion},
      ),
    ),
  );

  Future<DeviceAssignment> endDeviceAssignment({
    String? tenantId,
    required String id,
    required int version,
    String? reason,
  }) async => DeviceAssignment.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.deviceAssignmentEnd(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({'version': version, 'reason': reason}),
      ),
    ),
  );

  Future<PaginatedResponse<DeviceSecurityPolicy>> getSecurityPolicies({
    String? tenantId,
    String? outletId,
    DeviceSecurityPolicyStatus? status,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<DeviceSecurityPolicy>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.deviceSecurityPolicies,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          status: status?.wireName,
          page: page,
          limit: limit,
        ),
      ),
    ),
    DeviceSecurityPolicy.fromJson,
  );

  Future<DeviceSecurityPolicy> createSecurityPolicy({
    String? tenantId,
    String? outletId,
    required String name,
    bool requireTrustedSession = false,
    int sessionTimeoutMinutes = 1440,
    DateTime? forceLogoutBefore,
    List<DeviceType> allowedDeviceTypes = const <DeviceType>[],
  }) async => DeviceSecurityPolicy.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.deviceSecurityPolicies,
        data: _payload({
          'tenantId': tenantId,
          'outletId': outletId,
          'name': name,
          'requireTrustedSession': requireTrustedSession,
          'sessionTimeoutMinutes': sessionTimeoutMinutes,
          'forceLogoutBefore': forceLogoutBefore?.toUtc().toIso8601String(),
          'allowedDeviceTypes': allowedDeviceTypes
              .map((type) => type.wireName)
              .toList(growable: false),
        }),
      ),
    ),
  );

  Future<DeviceSecurityPolicy> updateSecurityPolicy({
    String? tenantId,
    required String id,
    String? name,
    DeviceSecurityPolicyStatus? status,
    bool? requireTrustedSession,
    int? sessionTimeoutMinutes,
    DateTime? forceLogoutBefore,
    List<DeviceType>? allowedDeviceTypes,
    required int version,
  }) async => DeviceSecurityPolicy.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.deviceSecurityPolicy(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({
          'name': name,
          'status': status?.wireName,
          'requireTrustedSession': requireTrustedSession,
          'sessionTimeoutMinutes': sessionTimeoutMinutes,
          'forceLogoutBefore': forceLogoutBefore?.toUtc().toIso8601String(),
          'allowedDeviceTypes': allowedDeviceTypes
              ?.map((type) => type.wireName)
              .toList(growable: false),
          'version': version,
        }),
      ),
    ),
  );

  Future<EffectiveDeviceSecurityPolicy> evaluateSecurityPolicy({
    String? tenantId,
    required String deviceId,
  }) async => EffectiveDeviceSecurityPolicy.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.deviceEffectiveSecurityPolicy(deviceId),
        queryParameters: _payload({'tenantId': tenantId}),
      ),
    ),
  );
}

Map<String, dynamic> _query({
  String? tenantId,
  String? outletId,
  String? deviceId,
  String? userId,
  String? terminalId,
  String? status,
  String? deviceType,
  String? terminalType,
  String? search,
  required int page,
  required int limit,
}) => _payload({
  'tenantId': tenantId,
  'outletId': outletId,
  'deviceId': deviceId,
  'userId': userId,
  'terminalId': terminalId,
  'status': status,
  'deviceType': deviceType,
  'terminalType': terminalType,
  'search': search,
  'page': page,
  'limit': limit,
});

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}

Map<String, dynamic> _payload(Map<String, dynamic> values) =>
    Map<String, dynamic>.fromEntries(
      values.entries.where((entry) => entry.value != null),
    );
