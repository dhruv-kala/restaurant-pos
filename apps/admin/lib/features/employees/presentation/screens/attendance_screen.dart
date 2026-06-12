import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/employees_providers.dart';

class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendance = ref.watch(attendanceProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Attendance')),
      body: attendance.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (page) => ListView.builder(
          itemCount: page.data.length,
          itemBuilder: (_, index) {
            final row = page.data[index];
            return ListTile(
              title: Text(row.employeeId),
              subtitle: Text(
                '${row.status.wireName} | ${row.workedMinutes} minutes',
              ),
              trailing: Text(
                row.businessDate.toIso8601String().substring(0, 10),
              ),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _attendanceAction(context, ref),
        icon: const Icon(Icons.login),
        label: const Text('Check In/Out'),
      ),
    );
  }

  Future<void> _attendanceAction(BuildContext context, WidgetRef ref) async {
    final employee = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Attendance Action'),
        content: TextField(
          controller: employee,
          decoration: const InputDecoration(labelText: 'Employee ID'),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await ref.read(employeesApiServiceProvider).checkOut({
                'employeeId': employee.text.trim(),
              });
              ref.invalidate(attendanceProvider);
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            },
            child: const Text('Check Out'),
          ),
          FilledButton(
            onPressed: () async {
              await ref.read(employeesApiServiceProvider).checkIn({
                'employeeId': employee.text.trim(),
              });
              ref.invalidate(attendanceProvider);
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            },
            child: const Text('Check In'),
          ),
        ],
      ),
    );
  }
}
