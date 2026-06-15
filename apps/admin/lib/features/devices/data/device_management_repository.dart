import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/device_query.dart';

class DeviceManagementRepository {
  const DeviceManagementRepository(this._api);
  final DeviceManagementApiService _api;

  Future<PaginatedResponse<Device>> devices(DeviceQuery query) =>
      _api.getDevices(
        tenantId: query.tenantId,
        outletId: query.outletId,
        status: query.status,
        deviceType: query.deviceType,
        search: query.search,
        page: query.page,
        limit: query.limit,
      );

  Future<Device> registerDevice({
    required String tenantId,
    String? outletId,
    required String deviceIdentifier,
    required String name,
    required DeviceType deviceType,
  }) => _api.registerDevice(
    tenantId: tenantId,
    outletId: outletId,
    deviceIdentifier: deviceIdentifier,
    name: name,
    deviceType: deviceType,
  );

  Future<Device> updateDeviceStatus(Device device, DeviceStatus status) =>
      _api.updateDeviceStatus(
        tenantId: device.tenantId,
        id: device.id,
        status: status,
        version: device.version,
      );

  Future<PaginatedResponse<DeviceEnrollment>> enrollments(
    DeviceEnrollmentQuery query,
  ) => _api.getDeviceEnrollments(
    tenantId: query.tenantId,
    deviceId: query.deviceId,
    page: query.page,
    limit: query.limit,
  );

  Future<DeviceEnrollment> requestEnrollment(Device device) => _api
      .requestDeviceEnrollment(tenantId: device.tenantId, deviceId: device.id);

  Future<DeviceEnrollment> approveEnrollment(DeviceEnrollment enrollment) =>
      _api.approveDeviceEnrollment(
        tenantId: enrollment.tenantId,
        id: enrollment.id,
        version: enrollment.version,
      );

  Future<PaginatedResponse<TrustedDeviceSession>> trustedSessions(
    TrustedSessionQuery query,
  ) => _api.getTrustedSessions(
    tenantId: query.tenantId,
    deviceId: query.deviceId,
    userId: query.userId,
    status: query.status,
    page: query.page,
    limit: query.limit,
  );

  Future<TrustedDeviceSession> renewSession(TrustedDeviceSession session) =>
      _api.renewTrustedSession(
        tenantId: session.tenantId,
        id: session.id,
        version: session.version,
      );

  Future<TrustedDeviceSession> revokeSession(
    TrustedDeviceSession session, {
    String? reason,
  }) => _api.revokeTrustedSession(
    tenantId: session.tenantId,
    id: session.id,
    version: session.version,
    reason: reason,
  );

  Future<PaginatedResponse<Terminal>> terminals(TerminalQuery query) =>
      _api.getTerminals(
        tenantId: query.tenantId,
        outletId: query.outletId,
        status: query.status,
        terminalType: query.terminalType,
        search: query.search,
        page: query.page,
        limit: query.limit,
      );

  Future<Terminal> createTerminal({
    required String tenantId,
    required String outletId,
    required String terminalCode,
    required String name,
    required TerminalType terminalType,
    String? description,
  }) => _api.createTerminal(
    tenantId: tenantId,
    outletId: outletId,
    terminalCode: terminalCode,
    name: name,
    terminalType: terminalType,
    description: description,
  );

  Future<Terminal> updateTerminalStatus(
    Terminal terminal,
    TerminalStatus status,
  ) => _api.updateTerminal(
    tenantId: terminal.tenantId,
    id: terminal.id,
    status: status,
    version: terminal.version,
  );

  Future<PaginatedResponse<DeviceAssignment>> assignments(
    DeviceAssignmentQuery query,
  ) => _api.getDeviceAssignments(
    tenantId: query.tenantId,
    terminalId: query.terminalId,
    deviceId: query.deviceId,
    status: query.status,
    page: query.page,
    limit: query.limit,
  );

  Future<DeviceAssignment> assignDevice({
    required Terminal terminal,
    required String deviceId,
  }) => _api.assignDeviceToTerminal(
    tenantId: terminal.tenantId,
    terminalId: terminal.id,
    deviceId: deviceId,
    terminalVersion: terminal.version,
  );

  Future<DeviceAssignment> endAssignment(
    DeviceAssignment assignment, {
    String? reason,
  }) => _api.endDeviceAssignment(
    tenantId: assignment.tenantId,
    id: assignment.id,
    version: assignment.version,
    reason: reason,
  );

  Future<PaginatedResponse<DeviceSecurityPolicy>> securityPolicies(
    SecurityPolicyQuery query,
  ) => _api.getSecurityPolicies(
    tenantId: query.tenantId,
    outletId: query.outletId,
    status: query.status,
    page: query.page,
    limit: query.limit,
  );

  Future<DeviceSecurityPolicy> createSecurityPolicy({
    required String tenantId,
    String? outletId,
    required String name,
    required bool requireTrustedSession,
    required int sessionTimeoutMinutes,
    required List<DeviceType> allowedDeviceTypes,
  }) => _api.createSecurityPolicy(
    tenantId: tenantId,
    outletId: outletId,
    name: name,
    requireTrustedSession: requireTrustedSession,
    sessionTimeoutMinutes: sessionTimeoutMinutes,
    allowedDeviceTypes: allowedDeviceTypes,
  );

  Future<DeviceSecurityPolicy> updateSecurityPolicyStatus(
    DeviceSecurityPolicy policy,
    DeviceSecurityPolicyStatus status,
  ) => _api.updateSecurityPolicy(
    tenantId: policy.tenantId,
    id: policy.id,
    status: status,
    version: policy.version,
  );

  Future<EffectiveDeviceSecurityPolicy> evaluatePolicy(Device device) => _api
      .evaluateSecurityPolicy(tenantId: device.tenantId, deviceId: device.id);
}
