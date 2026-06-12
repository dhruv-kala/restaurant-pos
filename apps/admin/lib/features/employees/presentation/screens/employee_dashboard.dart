import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/employees_providers.dart';
import 'add_employee_screen.dart';
import 'attendance_screen.dart';
import 'employee_list_screen.dart';
import 'performance_screen.dart';
import 'shift_management_screen.dart';

class EmployeeDashboard extends ConsumerWidget {
  const EmployeeDashboard({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metrics = ref.watch(employeeDashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Employees')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          metrics.when(
            loading: () => const LinearProgressIndicator(),
            error: (error, _) => Text('$error'),
            data: (data) => Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _Metric('Total Employees', data.totalEmployees),
                _Metric('Present Today', data.presentToday),
                _Metric('Absent Today', data.absentToday),
                _Metric('On Leave', data.employeesOnLeave),
                _Metric('Active Shifts', data.activeShifts),
              ],
            ),
          ),
          const SizedBox(height: 24),
          for (final action in <(String, IconData, Widget)>[
            ('Staff Directory', Icons.people, const EmployeeListScreen()),
            ('Add Employee', Icons.person_add, const AddEmployeeScreen()),
            ('Shift Management', Icons.schedule, const ShiftManagementScreen()),
            ('Attendance', Icons.how_to_reg, const AttendanceScreen()),
            ('Performance', Icons.leaderboard, const PerformanceScreen()),
          ])
            ListTile(
              leading: Icon(action.$2),
              title: Text(action.$1),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(
                context,
              ).push(MaterialPageRoute<void>(builder: (_) => action.$3)),
            ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);
  final String label;
  final int value;
  @override
  Widget build(BuildContext context) => Card(
    child: SizedBox(
      width: 150,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text('$value', style: Theme.of(context).textTheme.headlineSmall),
            Text(label),
          ],
        ),
      ),
    ),
  );
}
