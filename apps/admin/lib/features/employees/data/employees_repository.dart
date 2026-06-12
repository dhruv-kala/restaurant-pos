import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../domain/employee_query.dart';

class EmployeesRepository {
  const EmployeesRepository(this._api);
  final EmployeesApiService _api;
  Future<PaginatedResponse<EmployeeProfile>> employees(EmployeeQuery query) =>
      _api.getEmployees(
        page: query.page,
        limit: query.limit,
        search: query.search,
        outletId: query.outletId,
        department: query.department,
        status: query.status,
        shiftId: query.shiftId,
      );
  Future<EmployeeProfile> employee(String id) => _api.getEmployee(id);
  Future<EmployeeProfile> create(Map<String, dynamic> payload) =>
      _api.createEmployee(payload);
  Future<EmployeeProfile> update(String id, Map<String, dynamic> payload) =>
      _api.updateEmployee(id, payload);
  Future<void> delete(String id) => _api.deleteEmployee(id);
  Future<List<Shift>> shifts() => _api.getShifts();
  Future<PaginatedResponse<Attendance>> attendance() => _api.getAttendance();
  Future<List<EmployeePerformance>> performance() =>
      _api.getPerformanceReport();
  Future<EmployeeDashboardMetrics> dashboard() => _api.getDashboard();
}
