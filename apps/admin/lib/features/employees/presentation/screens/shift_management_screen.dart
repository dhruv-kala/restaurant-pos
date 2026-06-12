import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/employees_providers.dart';

class ShiftManagementScreen extends ConsumerWidget {
  const ShiftManagementScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shifts = ref.watch(shiftProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Shift Management')),
      body: shifts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (data) => ListView.builder(
          itemCount: data.length,
          itemBuilder: (_, index) {
            final shift = data[index];
            final start =
                '${shift.startTime.hour.toString().padLeft(2, '0')}:${shift.startTime.minute.toString().padLeft(2, '0')}';
            final end =
                '${shift.endTime.hour.toString().padLeft(2, '0')}:${shift.endTime.minute.toString().padLeft(2, '0')}';
            return ListTile(
              title: Text(shift.name),
              subtitle: Text('$start - $end | ${shift.breakMinutes} min break'),
              trailing: Icon(
                shift.isActive ? Icons.check_circle : Icons.cancel,
              ),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _create(context, ref),
        child: const Icon(Icons.add),
      ),
    );
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final outlet = TextEditingController();
    final name = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Create Shift'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: outlet,
              decoration: const InputDecoration(labelText: 'Outlet ID'),
            ),
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              await ref.read(employeesApiServiceProvider).createShift({
                'outletId': outlet.text.trim(),
                'name': name.text.trim(),
                'startTime': '09:00',
                'endTime': '18:00',
                'breakMinutes': 60,
              });
              ref.invalidate(shiftProvider);
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}
