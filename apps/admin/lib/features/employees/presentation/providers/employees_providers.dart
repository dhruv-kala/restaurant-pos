import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../../data/employees_repository.dart';
import '../../domain/employee_query.dart';

final employeesApiServiceProvider = Provider<EmployeesApiService>(
  (ref) => EmployeesApiService(ref.watch(dioProvider)),
);
final employeesRepositoryProvider = Provider<EmployeesRepository>(
  (ref) => EmployeesRepository(ref.watch(employeesApiServiceProvider)),
);
final employeeListProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<EmployeeProfile>, EmployeeQuery>(
      (ref, query) => ref.watch(employeesRepositoryProvider).employees(query),
    );
final employeeDetailsProvider = FutureProvider.autoDispose
    .family<EmployeeProfile, String>(
      (ref, id) => ref.watch(employeesRepositoryProvider).employee(id),
    );
final attendanceProvider =
    FutureProvider.autoDispose<PaginatedResponse<Attendance>>(
      (ref) => ref.watch(employeesRepositoryProvider).attendance(),
    );
final performanceProvider =
    FutureProvider.autoDispose<List<EmployeePerformance>>(
      (ref) => ref.watch(employeesRepositoryProvider).performance(),
    );
final shiftProvider = FutureProvider.autoDispose<List<Shift>>(
  (ref) => ref.watch(employeesRepositoryProvider).shifts(),
);
final employeeDashboardProvider =
    FutureProvider.autoDispose<EmployeeDashboardMetrics>(
      (ref) => ref.watch(employeesRepositoryProvider).dashboard(),
    );
