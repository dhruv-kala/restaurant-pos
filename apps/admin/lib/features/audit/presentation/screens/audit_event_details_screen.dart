import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/audit_providers.dart';

class AuditEventDetailsScreen extends ConsumerWidget {
  const AuditEventDetailsScreen({required this.eventId, super.key});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final event = ref.watch(auditEventProvider(eventId));
    return Scaffold(
      appBar: AppBar(title: const Text('Audit Event')),
      body: event.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (item) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _Field('Action', item.action),
            _Field('Result', item.result.wireName),
            _Field('Sequence', item.sequence),
            _Field('Target', '${item.targetType}: ${item.targetId ?? '-'}'),
            _Field('Actor', item.actorUserId ?? 'System'),
            _Field('Roles', item.actorRoles.join(', ')),
            _Field('Tenant', item.tenantId ?? 'Platform'),
            _Field('Outlet', item.outletId ?? '-'),
            _Field('Occurred', item.occurredAt.toLocal().toString()),
            _Field('Correlation', item.correlationId ?? '-'),
            _Field('Reason', item.reason ?? '-'),
            _Field('Previous hash', item.previousHash ?? 'Chain origin'),
            _Field('Event hash', item.eventHash),
            _JsonField('Changes', item.changes),
            _JsonField('Metadata', item.metadata),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) =>
      ListTile(title: Text(label), subtitle: SelectableText(value));
}

class _JsonField extends StatelessWidget {
  const _JsonField(this.label, this.value);
  final String label;
  final Map<String, dynamic>? value;

  @override
  Widget build(BuildContext context) => _Field(
    label,
    value == null ? '-' : const JsonEncoder.withIndent('  ').convert(value),
  );
}
