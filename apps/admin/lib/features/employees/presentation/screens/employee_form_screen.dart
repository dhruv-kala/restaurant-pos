import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../providers/employees_providers.dart';

class EmployeeFormScreen extends ConsumerStatefulWidget {
  const EmployeeFormScreen({this.employee, super.key});
  final EmployeeProfile? employee;
  @override
  ConsumerState<EmployeeFormScreen> createState() => _EmployeeFormScreenState();
}

class _EmployeeFormScreenState extends ConsumerState<EmployeeFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _outlet;
  late final TextEditingController _user;
  late final TextEditingController _role;
  late final TextEditingController _code;
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _designation;
  String _department = 'SERVICE';
  EmploymentType _employmentType = EmploymentType.fullTime;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final employee = widget.employee;
    _outlet = TextEditingController(text: employee?.outletId);
    _user = TextEditingController(text: employee?.userId);
    _role = TextEditingController(text: employee?.roleId);
    _code = TextEditingController(text: employee?.employeeCode);
    _firstName = TextEditingController(text: employee?.firstName);
    _lastName = TextEditingController(text: employee?.lastName);
    _designation = TextEditingController(text: employee?.designation);
    _department = employee?.department ?? 'SERVICE';
    _employmentType = employee?.employmentType ?? EmploymentType.fullTime;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.employee == null ? 'Add Employee' : 'Edit Employee'),
    ),
    body: Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (widget.employee == null) ...[
            _field(_outlet, 'Outlet ID'),
            _field(_user, 'Existing User ID'),
            _field(_role, 'Role ID'),
            _field(_code, 'Employee Code'),
          ],
          _field(_firstName, 'First Name'),
          _field(_lastName, 'Last Name', required: false),
          _field(_designation, 'Designation'),
          DropdownButtonFormField<String>(
            initialValue: _department,
            decoration: const InputDecoration(labelText: 'Department'),
            items:
                const [
                      'OPERATIONS',
                      'KITCHEN',
                      'SERVICE',
                      'CASHIER',
                      'MANAGEMENT',
                      'INVENTORY',
                      'ADMINISTRATION',
                    ]
                    .map(
                      (value) =>
                          DropdownMenuItem(value: value, child: Text(value)),
                    )
                    .toList(),
            onChanged: (value) => _department = value ?? _department,
          ),
          DropdownButtonFormField<EmploymentType>(
            initialValue: _employmentType,
            decoration: const InputDecoration(labelText: 'Employment Type'),
            items: EmploymentType.values
                .map(
                  (value) => DropdownMenuItem(
                    value: value,
                    child: Text(value.wireName),
                  ),
                )
                .toList(),
            onChanged: (value) => _employmentType = value ?? _employmentType,
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Saving...' : 'Save'),
          ),
        ],
      ),
    ),
  );

  Widget _field(
    TextEditingController controller,
    String label, {
    bool required = true,
  }) => TextFormField(
    controller: controller,
    decoration: InputDecoration(labelText: label),
    validator: required
        ? (value) => value == null || value.trim().isEmpty ? 'Required' : null
        : null,
  );

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{
        if (widget.employee == null) 'outletId': _outlet.text.trim(),
        if (widget.employee == null) 'userId': _user.text.trim(),
        if (widget.employee == null) 'roleId': _role.text.trim(),
        if (widget.employee == null) 'employeeCode': _code.text.trim(),
        'firstName': _firstName.text.trim(),
        if (_lastName.text.trim().isNotEmpty) 'lastName': _lastName.text.trim(),
        'designation': _designation.text.trim(),
        'department': _department,
        'employmentType': _employmentType.wireName,
        if (widget.employee == null)
          'dateOfJoining': DateTime.now().toIso8601String().substring(0, 10),
      };
      final repository = ref.read(employeesRepositoryProvider);
      if (widget.employee == null) {
        await repository.create(payload);
      } else {
        await repository.update(widget.employee!.id, payload);
      }
      ref.invalidate(employeeListProvider);
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
