import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/employee_query.dart';
import '../providers/employees_providers.dart';
import 'employee_details_screen.dart';

class EmployeeListScreen extends ConsumerStatefulWidget {
  const EmployeeListScreen({super.key});
  @override
  ConsumerState<EmployeeListScreen> createState() => _EmployeeListScreenState();
}

class _EmployeeListScreenState extends ConsumerState<EmployeeListScreen> {
  String _search = '';
  @override
  Widget build(BuildContext context) {
    final employees = ref.watch(
      employeeListProvider(EmployeeQuery(search: _search)),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Staff Directory')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                labelText: 'Search',
              ),
              onChanged: (value) => setState(() => _search = value),
            ),
          ),
          Expanded(
            child: employees.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
              data: (page) => ListView.builder(
                itemCount: page.data.length,
                itemBuilder: (_, index) {
                  final employee = page.data[index];
                  return ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.person)),
                    title: Text(employee.displayName),
                    subtitle: Text(
                      '${employee.employeeCode} | ${employee.designation}',
                    ),
                    trailing: Text(employee.status.wireName),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            EmployeeDetailsScreen(employeeId: employee.id),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
