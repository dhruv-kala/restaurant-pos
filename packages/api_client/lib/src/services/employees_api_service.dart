import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../api_endpoints.dart';

class EmployeesApiService {
  const EmployeesApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<EmployeeProfile>> getEmployees({
    int page = 1,
    int limit = 20,
    String? search,
    String? outletId,
    String? department,
    String? status,
    String? shiftId,
  }) async => PaginatedResponse<EmployeeProfile>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.employees,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (search?.isNotEmpty ?? false) 'search': search,
          if (outletId != null) 'outletId': outletId,
          if (department != null) 'department': department,
          if (status != null) 'status': status,
          if (shiftId != null) 'shiftId': shiftId,
        },
      ),
    ),
    EmployeeProfile.fromJson,
  );
  Future<EmployeeProfile> getEmployee(String id) async =>
      EmployeeProfile.fromJson(
        _map(await _dio.get<Object?>(ApiEndpoints.employee(id))),
      );
  Future<EmployeeProfile> createEmployee(Map<String, dynamic> payload) async =>
      EmployeeProfile.fromJson(
        _map(await _dio.post<Object?>(ApiEndpoints.employees, data: payload)),
      );
  Future<EmployeeProfile> updateEmployee(
    String id,
    Map<String, dynamic> payload,
  ) async => EmployeeProfile.fromJson(
    _map(await _dio.patch<Object?>(ApiEndpoints.employee(id), data: payload)),
  );
  Future<void> deleteEmployee(String id) async =>
      _dio.delete<Object?>(ApiEndpoints.employee(id));
  Future<List<Shift>> getShifts({String? outletId}) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.shifts,
      queryParameters: {if (outletId != null) 'outletId': outletId},
    ),
    Shift.fromJson,
  );
  Future<Shift> createShift(Map<String, dynamic> payload) async =>
      Shift.fromJson(
        _map(await _dio.post<Object?>(ApiEndpoints.shifts, data: payload)),
      );
  Future<Map<String, dynamic>> assignShift(
    Map<String, dynamic> payload,
  ) async =>
      _map(await _dio.post<Object?>(ApiEndpoints.assignShift, data: payload));
  Future<Attendance> checkIn(Map<String, dynamic> payload) async =>
      Attendance.fromJson(
        _map(
          await _dio.post<Object?>(
            ApiEndpoints.attendanceCheckIn,
            data: payload,
          ),
        ),
      );
  Future<Attendance> checkOut(Map<String, dynamic> payload) async =>
      Attendance.fromJson(
        _map(
          await _dio.post<Object?>(
            ApiEndpoints.attendanceCheckOut,
            data: payload,
          ),
        ),
      );
  Future<PaginatedResponse<Attendance>> getAttendance({
    String? employeeId,
  }) async => PaginatedResponse<Attendance>.fromJson(
    _map(
      await _dio.get<Object?>(
        employeeId == null
            ? ApiEndpoints.attendance
            : ApiEndpoints.employeeAttendance(employeeId),
      ),
    ),
    Attendance.fromJson,
  );
  Future<List<EmployeePerformance>> getEmployeePerformance(String id) async =>
      _list(
        await _dio.get<Object?>(ApiEndpoints.employeePerformance(id)),
        EmployeePerformance.fromJson,
      );
  Future<List<EmployeePerformance>> getPerformanceReport() async => _list(
    await _dio.get<Object?>(ApiEndpoints.employeePerformanceReport),
    EmployeePerformance.fromJson,
  );
  Future<EmployeeDashboardMetrics> getDashboard() async =>
      EmployeeDashboardMetrics.fromJson(
        _map(await _dio.get<Object?>(ApiEndpoints.employeeDashboard)),
      );
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map)
    return Map<String, dynamic>.from(response.data! as Map);
  throw const FormatException('Expected an object response.');
}

List<T> _list<T>(
  Response<Object?> response,
  T Function(Map<String, dynamic>) parser,
) => (response.data as List? ?? const [])
    .map((item) => parser(Map<String, dynamic>.from(item as Map)))
    .toList(growable: false);
