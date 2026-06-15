import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/device_query.dart';
import '../providers/device_management_providers.dart';

class DeviceAdminScreen extends ConsumerStatefulWidget {
  const DeviceAdminScreen({super.key});

  @override
  ConsumerState<DeviceAdminScreen> createState() => _DeviceAdminScreenState();
}

class _DeviceAdminScreenState extends ConsumerState<DeviceAdminScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _tenantId = TextEditingController();
  final _outletId = TextEditingController();
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 6, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _tenantId.dispose();
    _outletId.dispose();
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenantId = _tenantId.text.trim();
    final outletId = _emptyToNull(_outletId.text);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Device administration'),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Devices'),
            Tab(text: 'Enrollments'),
            Tab(text: 'Sessions'),
            Tab(text: 'Terminals'),
            Tab(text: 'Policies'),
            Tab(text: 'Audit'),
          ],
        ),
      ),
      body: Column(
        children: [
          _ScopeBar(
            tenantId: _tenantId,
            outletId: _outletId,
            search: _search,
            onChanged: () => setState(() {}),
          ),
          Expanded(
            child: tenantId.isEmpty
                ? const _EmptyState(
                    message: 'Enter a tenant ID to load device administration.',
                  )
                : TabBarView(
                    controller: _tabs,
                    children: [
                      _DeviceList(
                        query: DeviceQuery(
                          tenantId: tenantId,
                          outletId: outletId,
                          search: _emptyToNull(_search.text),
                        ),
                      ),
                      _EnrollmentList(tenantId: tenantId, outletId: outletId),
                      _TrustedSessionList(tenantId: tenantId),
                      _TerminalList(tenantId: tenantId, outletId: outletId),
                      _SecurityPolicyList(
                        query: SecurityPolicyQuery(
                          tenantId: tenantId,
                          outletId: outletId,
                        ),
                      ),
                      _DeviceAuditList(tenantId: tenantId, outletId: outletId),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _ScopeBar extends StatelessWidget {
  const _ScopeBar({
    required this.tenantId,
    required this.outletId,
    required this.search,
    required this.onChanged,
  });

  final TextEditingController tenantId;
  final TextEditingController outletId;
  final TextEditingController search;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(12),
    child: Wrap(
      runSpacing: 8,
      spacing: 12,
      children: [
        SizedBox(
          width: 320,
          child: TextField(
            controller: tenantId,
            decoration: const InputDecoration(
              labelText: 'Tenant ID',
              border: OutlineInputBorder(),
            ),
            onSubmitted: (_) => onChanged(),
          ),
        ),
        SizedBox(
          width: 320,
          child: TextField(
            controller: outletId,
            decoration: const InputDecoration(
              labelText: 'Outlet ID',
              border: OutlineInputBorder(),
            ),
            onSubmitted: (_) => onChanged(),
          ),
        ),
        SizedBox(
          width: 260,
          child: TextField(
            controller: search,
            decoration: const InputDecoration(
              labelText: 'Search devices or terminals',
              border: OutlineInputBorder(),
            ),
            onSubmitted: (_) => onChanged(),
          ),
        ),
        FilledButton.icon(
          onPressed: onChanged,
          icon: const Icon(Icons.refresh),
          label: const Text('Load'),
        ),
      ],
    ),
  );
}

class _DeviceList extends ConsumerWidget {
  const _DeviceList({required this.query});

  final DeviceQuery query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(devicesProvider(query));
    return _AsyncList<Device>(
      title: 'Registered devices',
      value: value,
      emptyMessage: 'No devices found.',
      action: FilledButton.icon(
        onPressed: () => _registerDevice(context, ref, query),
        icon: const Icon(Icons.add),
        label: const Text('Register device'),
      ),
      itemBuilder: (context, device) => ListTile(
        leading: Icon(
          device.status == DeviceStatus.active
              ? Icons.devices
              : Icons.devices_other,
        ),
        title: Text('${device.name} (${device.deviceIdentifier})'),
        subtitle: Text(
          '${device.deviceType.wireName} · ${device.status.wireName}\n'
          'Outlet ${device.outletId ?? 'tenant scope'} · version ${device.version}',
        ),
        isThreeLine: true,
        trailing: Wrap(
          spacing: 8,
          children: [
            IconButton(
              tooltip: 'Evaluate policy',
              onPressed: () => _evaluatePolicy(context, ref, device),
              icon: const Icon(Icons.policy),
            ),
            PopupMenuButton<DeviceStatus>(
              tooltip: 'Change status',
              onSelected: (status) => _run(
                context,
                () => ref
                    .read(deviceManagementRepositoryProvider)
                    .updateDeviceStatus(device, status),
              ),
              itemBuilder: (context) => DeviceStatus.values
                  .map(
                    (status) => PopupMenuItem(
                      value: status,
                      child: Text(status.wireName),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _EnrollmentList extends ConsumerWidget {
  const _EnrollmentList({required this.tenantId, required this.outletId});

  final String tenantId;
  final String? outletId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final devices = ref.watch(
      devicesProvider(DeviceQuery(tenantId: tenantId, outletId: outletId)),
    );
    return devices.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _ErrorState(error: error),
      data: (page) => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Text(
            'Enrollment management',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          for (final device in page.data)
            Card(
              child: ExpansionTile(
                title: Text('${device.name} · ${device.status.wireName}'),
                subtitle: Text(device.deviceIdentifier),
                trailing: TextButton(
                  onPressed: () => _run(
                    context,
                    () => ref
                        .read(deviceManagementRepositoryProvider)
                        .requestEnrollment(device),
                  ),
                  child: const Text('Request'),
                ),
                children: [_EnrollmentHistory(device: device)],
              ),
            ),
        ],
      ),
    );
  }
}

class _EnrollmentHistory extends ConsumerWidget {
  const _EnrollmentHistory({required this.device});

  final Device device;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(
      deviceEnrollmentsProvider(
        DeviceEnrollmentQuery(tenantId: device.tenantId, deviceId: device.id),
      ),
    );
    return value.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: LinearProgressIndicator(),
      ),
      error: (error, _) => Padding(
        padding: const EdgeInsets.all(16),
        child: Text('Failed to load enrollments: $error'),
      ),
      data: (page) => Column(
        children: [
          if (page.data.isEmpty)
            const ListTile(title: Text('No enrollment history.')),
          for (final enrollment in page.data)
            ListTile(
              title: Text(enrollment.status.wireName),
              subtitle: Text(
                'Code ${enrollment.activationCodeMasked} · expires ${_dateTime(enrollment.expiresAt)}',
              ),
              trailing: enrollment.status == DeviceEnrollmentStatus.requested
                  ? TextButton(
                      onPressed: () => _run(
                        context,
                        () => ref
                            .read(deviceManagementRepositoryProvider)
                            .approveEnrollment(enrollment),
                      ),
                      child: const Text('Approve'),
                    )
                  : null,
            ),
        ],
      ),
    );
  }
}

class _TrustedSessionList extends ConsumerWidget {
  const _TrustedSessionList({required this.tenantId});

  final String tenantId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(
      trustedSessionsProvider(TrustedSessionQuery(tenantId: tenantId)),
    );
    return _AsyncList<TrustedDeviceSession>(
      title: 'Trusted sessions',
      value: value,
      emptyMessage: 'No trusted sessions found.',
      itemBuilder: (context, session) => ListTile(
        leading: Icon(
          session.status == TrustedSessionStatus.active
              ? Icons.verified_user
              : Icons.block,
        ),
        title: Text(
          '${session.sessionTokenMasked} · ${session.status.wireName}',
        ),
        subtitle: Text(
          'Device ${session.deviceId}\nExpires ${_dateTime(session.expiresAt)}',
        ),
        isThreeLine: true,
        trailing: session.status == TrustedSessionStatus.active
            ? Wrap(
                spacing: 8,
                children: [
                  TextButton(
                    onPressed: () => _run(
                      context,
                      () => ref
                          .read(deviceManagementRepositoryProvider)
                          .renewSession(session),
                    ),
                    child: const Text('Renew'),
                  ),
                  TextButton(
                    onPressed: () => _run(
                      context,
                      () => ref
                          .read(deviceManagementRepositoryProvider)
                          .revokeSession(
                            session,
                            reason: 'Revoked from admin UI',
                          ),
                    ),
                    child: const Text('Revoke'),
                  ),
                ],
              )
            : null,
      ),
    );
  }
}

class _TerminalList extends ConsumerWidget {
  const _TerminalList({required this.tenantId, required this.outletId});

  final String tenantId;
  final String? outletId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = TerminalQuery(tenantId: tenantId, outletId: outletId);
    final value = ref.watch(terminalsProvider(query));
    return _AsyncList<Terminal>(
      title: 'Terminals',
      value: value,
      emptyMessage: 'No terminals found.',
      action: FilledButton.icon(
        onPressed: outletId == null
            ? null
            : () => _createTerminal(context, ref, tenantId, outletId!),
        icon: const Icon(Icons.add),
        label: const Text('Create terminal'),
      ),
      itemBuilder: (context, terminal) => Card(
        child: ExpansionTile(
          title: Text('${terminal.name} (${terminal.terminalCode})'),
          subtitle: Text(
            '${terminal.terminalType.wireName} · ${terminal.status.wireName}',
          ),
          trailing: PopupMenuButton<TerminalStatus>(
            onSelected: (status) => _run(
              context,
              () => ref
                  .read(deviceManagementRepositoryProvider)
                  .updateTerminalStatus(terminal, status),
            ),
            itemBuilder: (context) => TerminalStatus.values
                .map(
                  (status) => PopupMenuItem(
                    value: status,
                    child: Text(status.wireName),
                  ),
                )
                .toList(),
          ),
          children: [
            _Assignments(tenantId: tenantId, terminal: terminal),
            ListTile(
              trailing: TextButton(
                onPressed: () => _assignDevice(context, ref, terminal),
                child: const Text('Assign device'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Assignments extends ConsumerWidget {
  const _Assignments({required this.tenantId, required this.terminal});

  final String tenantId;
  final Terminal terminal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(
      deviceAssignmentsProvider(
        DeviceAssignmentQuery(tenantId: tenantId, terminalId: terminal.id),
      ),
    );
    return value.when(
      loading: () => const LinearProgressIndicator(),
      error: (error, _) => ListTile(title: Text('Assignments failed: $error')),
      data: (page) => Column(
        children: [
          if (page.data.isEmpty)
            const ListTile(title: Text('No assignment history.')),
          for (final assignment in page.data)
            ListTile(
              title: Text(
                '${assignment.deviceId} · ${assignment.status.wireName}',
              ),
              subtitle: Text('Assigned ${_dateTime(assignment.assignedAt)}'),
              trailing: assignment.status == DeviceAssignmentStatus.active
                  ? TextButton(
                      onPressed: () => _run(
                        context,
                        () => ref
                            .read(deviceManagementRepositoryProvider)
                            .endAssignment(
                              assignment,
                              reason: 'Ended from admin UI',
                            ),
                      ),
                      child: const Text('End'),
                    )
                  : null,
            ),
        ],
      ),
    );
  }
}

class _SecurityPolicyList extends ConsumerWidget {
  const _SecurityPolicyList({required this.query});

  final SecurityPolicyQuery query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(securityPoliciesProvider(query));
    return _AsyncList<DeviceSecurityPolicy>(
      title: 'Security policies',
      value: value,
      emptyMessage: 'No policies found.',
      action: FilledButton.icon(
        onPressed: () => _createPolicy(context, ref, query),
        icon: const Icon(Icons.add),
        label: const Text('Create policy'),
      ),
      itemBuilder: (context, policy) => ListTile(
        leading: Icon(
          policy.status == DeviceSecurityPolicyStatus.active
              ? Icons.security
              : Icons.security_update_warning,
        ),
        title: Text(policy.name),
        subtitle: Text(
          '${policy.status.wireName} · ${policy.sessionTimeoutMinutes} minutes\n'
          'Scope ${policy.outletId ?? 'tenant'} · allowed ${policy.allowedDeviceTypes.map((e) => e.wireName).join(', ')}',
        ),
        isThreeLine: true,
        trailing: PopupMenuButton<DeviceSecurityPolicyStatus>(
          onSelected: (status) => _run(
            context,
            () => ref
                .read(deviceManagementRepositoryProvider)
                .updateSecurityPolicyStatus(policy, status),
          ),
          itemBuilder: (context) => DeviceSecurityPolicyStatus.values
              .map(
                (status) =>
                    PopupMenuItem(value: status, child: Text(status.wireName)),
              )
              .toList(),
        ),
      ),
    );
  }
}

class _DeviceAuditList extends ConsumerWidget {
  const _DeviceAuditList({required this.tenantId, required this.outletId});

  final String tenantId;
  final String? outletId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(
      deviceAuditEventsProvider(
        DeviceAuditQuery(tenantId: tenantId, outletId: outletId),
      ),
    );
    return _AsyncList<AuditEvent>(
      title: 'Device audit events',
      value: value,
      emptyMessage: 'No device audit events found.',
      itemBuilder: (context, event) => ListTile(
        leading: const Icon(Icons.history),
        title: Text(event.action),
        subtitle: Text(
          '${event.targetType} ${event.targetId ?? ''}\n${_dateTime(event.occurredAt)}',
        ),
        isThreeLine: true,
      ),
    );
  }
}

class _AsyncList<T> extends StatelessWidget {
  const _AsyncList({
    required this.title,
    required this.value,
    required this.emptyMessage,
    required this.itemBuilder,
    this.action,
  });

  final String title;
  final AsyncValue<PaginatedResponse<T>> value;
  final String emptyMessage;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final Widget? action;

  @override
  Widget build(BuildContext context) => value.when(
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (error, _) => _ErrorState(error: error),
    data: (page) => ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(title, style: Theme.of(context).textTheme.titleLarge),
            ),
            ?action,
          ],
        ),
        const SizedBox(height: 8),
        if (page.data.isEmpty) _EmptyState(message: emptyMessage),
        for (final item in page.data) itemBuilder(context, item),
        const SizedBox(height: 8),
        Text(
          'Page ${page.meta.page} of ${page.meta.totalPages}. Total ${page.meta.total}.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    ),
  );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(message, textAlign: TextAlign.center),
    ),
  );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text('Failed to load device data: $error'),
    ),
  );
}

Future<void> _registerDevice(
  BuildContext context,
  WidgetRef ref,
  DeviceQuery query,
) async {
  final id = TextEditingController();
  final name = TextEditingController();
  var type = DeviceType.posTerminal;
  final submitted = await _formDialog(
    context,
    title: 'Register device',
    children: [
      TextField(
        controller: id,
        decoration: const InputDecoration(labelText: 'Identifier'),
      ),
      TextField(
        controller: name,
        decoration: const InputDecoration(labelText: 'Name'),
      ),
      DropdownButtonFormField<DeviceType>(
        initialValue: type,
        items: DeviceType.values
            .map(
              (item) =>
                  DropdownMenuItem(value: item, child: Text(item.wireName)),
            )
            .toList(),
        onChanged: (value) => type = value ?? type,
        decoration: const InputDecoration(labelText: 'Type'),
      ),
    ],
  );
  if (!context.mounted) return;
  if (submitted == true) {
    await _run(
      context,
      () => ref
          .read(deviceManagementRepositoryProvider)
          .registerDevice(
            tenantId: query.tenantId,
            outletId: query.outletId,
            deviceIdentifier: id.text.trim(),
            name: name.text.trim(),
            deviceType: type,
          ),
    );
  }
}

Future<void> _createTerminal(
  BuildContext context,
  WidgetRef ref,
  String tenantId,
  String outletId,
) async {
  final code = TextEditingController();
  final name = TextEditingController();
  var type = TerminalType.posCounter;
  final submitted = await _formDialog(
    context,
    title: 'Create terminal',
    children: [
      TextField(
        controller: code,
        decoration: const InputDecoration(labelText: 'Terminal code'),
      ),
      TextField(
        controller: name,
        decoration: const InputDecoration(labelText: 'Name'),
      ),
      DropdownButtonFormField<TerminalType>(
        initialValue: type,
        items: TerminalType.values
            .map(
              (item) =>
                  DropdownMenuItem(value: item, child: Text(item.wireName)),
            )
            .toList(),
        onChanged: (value) => type = value ?? type,
        decoration: const InputDecoration(labelText: 'Type'),
      ),
    ],
  );
  if (!context.mounted) return;
  if (submitted == true) {
    await _run(
      context,
      () => ref
          .read(deviceManagementRepositoryProvider)
          .createTerminal(
            tenantId: tenantId,
            outletId: outletId,
            terminalCode: code.text.trim(),
            name: name.text.trim(),
            terminalType: type,
          ),
    );
  }
}

Future<void> _assignDevice(
  BuildContext context,
  WidgetRef ref,
  Terminal terminal,
) async {
  final deviceId = TextEditingController();
  final submitted = await _formDialog(
    context,
    title: 'Assign device',
    children: [
      TextField(
        controller: deviceId,
        decoration: const InputDecoration(labelText: 'Device ID'),
      ),
    ],
  );
  if (!context.mounted) return;
  if (submitted == true) {
    await _run(
      context,
      () => ref
          .read(deviceManagementRepositoryProvider)
          .assignDevice(terminal: terminal, deviceId: deviceId.text.trim()),
    );
  }
}

Future<void> _createPolicy(
  BuildContext context,
  WidgetRef ref,
  SecurityPolicyQuery query,
) async {
  final name = TextEditingController();
  final timeout = TextEditingController(text: '1440');
  var requireTrusted = true;
  var allowedTypes = <DeviceType>{DeviceType.posTerminal};
  final submitted = await _formDialog(
    context,
    title: 'Create security policy',
    children: [
      TextField(
        controller: name,
        decoration: const InputDecoration(labelText: 'Name'),
      ),
      TextField(
        controller: timeout,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(labelText: 'Session timeout minutes'),
      ),
      StatefulBuilder(
        builder: (context, setState) => Column(
          children: [
            SwitchListTile(
              value: requireTrusted,
              title: const Text('Require trusted session'),
              onChanged: (value) => setState(() => requireTrusted = value),
            ),
            Wrap(
              spacing: 8,
              children: DeviceType.values
                  .map(
                    (type) => FilterChip(
                      selected: allowedTypes.contains(type),
                      label: Text(type.wireName),
                      onSelected: (selected) => setState(() {
                        if (selected) {
                          allowedTypes.add(type);
                        } else {
                          allowedTypes.remove(type);
                        }
                      }),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    ],
  );
  if (!context.mounted) return;
  if (submitted == true) {
    await _run(
      context,
      () => ref
          .read(deviceManagementRepositoryProvider)
          .createSecurityPolicy(
            tenantId: query.tenantId,
            outletId: query.outletId,
            name: name.text.trim(),
            requireTrustedSession: requireTrusted,
            sessionTimeoutMinutes: int.tryParse(timeout.text.trim()) ?? 1440,
            allowedDeviceTypes: allowedTypes.toList(growable: false),
          ),
    );
  }
}

Future<void> _evaluatePolicy(
  BuildContext context,
  WidgetRef ref,
  Device device,
) async {
  final policy = await ref
      .read(deviceManagementRepositoryProvider)
      .evaluatePolicy(device);
  if (!context.mounted) return;
  await showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Effective security policy'),
      content: Text(
        'Scope: ${policy.policyScope}\n'
        'Policy: ${policy.policyId ?? 'default'}\n'
        'Trusted session required: ${policy.requireTrustedSession}\n'
        'Timeout: ${policy.sessionTimeoutMinutes} minutes\n'
        'Device type allowed: ${policy.allowedDeviceType}',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    ),
  );
}

Future<bool?> _formDialog(
  BuildContext context, {
  required String title,
  required List<Widget> children,
}) => showDialog<bool>(
  context: context,
  builder: (context) => AlertDialog(
    title: Text(title),
    content: SizedBox(
      width: 420,
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: children),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.of(context).pop(false),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(true),
        child: const Text('Save'),
      ),
    ],
  ),
);

Future<void> _run(
  BuildContext context,
  Future<Object?> Function() action,
) async {
  try {
    await action();
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Device operation completed. Reload to refresh.'),
        ),
      );
    }
  } catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Device operation failed: $error')),
      );
    }
  }
}

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

String _dateTime(DateTime value) => value.toLocal().toString();
