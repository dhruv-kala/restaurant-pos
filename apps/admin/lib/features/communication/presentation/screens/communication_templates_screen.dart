import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/communication_query.dart';
import '../providers/communication_providers.dart';

class CommunicationTemplatesScreen extends ConsumerStatefulWidget {
  const CommunicationTemplatesScreen({super.key});

  @override
  ConsumerState<CommunicationTemplatesScreen> createState() =>
      _CommunicationTemplatesScreenState();
}

class _CommunicationTemplatesScreenState
    extends ConsumerState<CommunicationTemplatesScreen> {
  final _search = TextEditingController();
  CommunicationTemplateQuery _query = const CommunicationTemplateQuery();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).user;
    final canManage =
        user?.hasRole(UserRole.superAdmin) == true ||
        user?.hasRole(UserRole.tenantAdmin) == true ||
        user?.hasPermission('communication.template_manage') == true;
    final templates = ref.watch(communicationTemplatesProvider(_query));
    return Scaffold(
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => _editTemplate(),
              icon: const Icon(Icons.add),
              label: const Text('New template'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: 340,
                  child: TextField(
                    controller: _search,
                    decoration: const InputDecoration(
                      labelText: 'Search templates',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onSubmitted: (value) => setState(
                      () => _query = _query.copyWith(
                        page: 1,
                        search: value.trim(),
                      ),
                    ),
                  ),
                ),
                DropdownButton<CommunicationChannel?>(
                  value: _query.channel,
                  hint: const Text('All channels'),
                  items: [
                    const DropdownMenuItem(
                      value: null,
                      child: Text('All channels'),
                    ),
                    ...CommunicationChannel.values.map(
                      (channel) => DropdownMenuItem(
                        value: channel,
                        child: Text(channel.wireName),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(
                    () => _query = _query.copyWith(
                      page: 1,
                      channel: value,
                      clearChannel: value == null,
                    ),
                  ),
                ),
                DropdownButton<CommunicationTemplateStatus?>(
                  value: _query.status,
                  hint: const Text('All statuses'),
                  items: [
                    const DropdownMenuItem(
                      value: null,
                      child: Text('All statuses'),
                    ),
                    ...CommunicationTemplateStatus.values.map(
                      (status) => DropdownMenuItem(
                        value: status,
                        child: Text(status.wireName),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(
                    () => _query = _query.copyWith(
                      page: 1,
                      status: value,
                      clearStatus: value == null,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Refresh',
                  onPressed: () =>
                      ref.invalidate(communicationTemplatesProvider(_query)),
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
          ),
          Expanded(
            child: templates.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
              data: (page) => page.data.isEmpty
                  ? const Center(child: Text('No templates found.'))
                  : ListView.separated(
                      itemCount: page.data.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final template = page.data[index];
                        return ListTile(
                          leading: const Icon(Icons.article_outlined),
                          title: Text(template.name),
                          subtitle: Text(
                            '${template.templateKey} | '
                            '${template.channel.wireName} | '
                            'v${template.version}',
                          ),
                          trailing: Chip(label: Text(template.status.wireName)),
                          onTap: () => _showTemplate(template, canManage),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showTemplate(
    CommunicationTemplate template,
    bool canManage,
  ) => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(template.name),
      content: SizedBox(
        width: 700,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${template.channel.wireName} | ${template.status.wireName}',
              ),
              if (template.description != null) Text(template.description!),
              const Divider(),
              if (template.latestVersion.subjectTemplate != null)
                SelectableText(
                  'Subject: ${template.latestVersion.subjectTemplate}',
                ),
              const SizedBox(height: 8),
              SelectableText(template.latestVersion.bodyTemplate),
              const SizedBox(height: 16),
              Text(
                'Variables: ${template.latestVersion.variables.map((item) => item.key).join(', ')}',
              ),
              const SizedBox(height: 16),
              Text(
                'Version history',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Consumer(
                builder: (context, ref, _) {
                  final versions = ref.watch(
                    communicationTemplateVersionsProvider(template.id),
                  );
                  return versions.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (error, _) => Text('$error'),
                    data: (items) => Column(
                      children: items
                          .map(
                            (version) => ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text('Version ${version.versionNumber}'),
                              subtitle: Text(
                                '${version.createdByName ?? 'Unknown user'} | '
                                '${version.createdAt.toLocal()}',
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => _previewTemplate(template),
          child: const Text('Preview'),
        ),
        if (canManage)
          FilledButton.tonal(
            onPressed: () {
              Navigator.pop(context);
              _editTemplate(template);
            },
            child: const Text('Edit'),
          ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );

  Future<void> _previewTemplate(CommunicationTemplate template) async {
    final values = TextEditingController(
      text: jsonEncode({
        for (final variable in template.latestVersion.variables)
          variable.key: variable.key,
      }),
    );
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Preview variables'),
        content: SizedBox(
          width: 560,
          child: TextField(
            controller: values,
            maxLines: 10,
            decoration: const InputDecoration(
              labelText: 'JSON values',
              alignLabelWithHint: true,
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Render'),
          ),
        ],
      ),
    );
    if (submitted != true) return;
    try {
      final decoded = jsonDecode(values.text);
      if (decoded is! Map) {
        throw const FormatException('Expected a JSON object.');
      }
      final preview = await ref
          .read(communicationRepositoryProvider)
          .previewTemplate(template.id, Map<String, dynamic>.from(decoded));
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(preview.subject ?? 'Template preview'),
          content: SizedBox(width: 600, child: SelectableText(preview.body)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _editTemplate([CommunicationTemplate? template]) async {
    final key = TextEditingController(text: template?.templateKey);
    final name = TextEditingController(text: template?.name);
    final description = TextEditingController(text: template?.description);
    final subject = TextEditingController(
      text: template?.latestVersion.subjectTemplate,
    );
    final body = TextEditingController(
      text: template?.latestVersion.bodyTemplate,
    );
    final variables = TextEditingController(
      text: template?.latestVersion.variables
          .map((item) => item.key)
          .join(', '),
    );
    var channel = template?.channel ?? CommunicationChannel.email;
    var status = template?.status ?? CommunicationTemplateStatus.draft;
    final submitted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(template == null ? 'Create template' : 'Edit template'),
          content: SizedBox(
            width: 680,
            child: SingleChildScrollView(
              child: Column(
                children: [
                  TextField(
                    controller: key,
                    enabled: template == null,
                    decoration: const InputDecoration(
                      labelText: 'Template key',
                    ),
                  ),
                  TextField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                  TextField(
                    controller: description,
                    decoration: const InputDecoration(labelText: 'Description'),
                  ),
                  DropdownButtonFormField<CommunicationChannel>(
                    initialValue: channel,
                    decoration: const InputDecoration(labelText: 'Channel'),
                    items: CommunicationChannel.values
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(item.wireName),
                          ),
                        )
                        .toList(),
                    onChanged: template == null
                        ? (value) => setState(() => channel = value ?? channel)
                        : null,
                  ),
                  DropdownButtonFormField(
                    initialValue: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: CommunicationTemplateStatus.values
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(item.wireName),
                          ),
                        )
                        .toList(),
                    onChanged: (value) =>
                        setState(() => status = value ?? status),
                  ),
                  if (channel == CommunicationChannel.email)
                    TextField(
                      controller: subject,
                      decoration: const InputDecoration(
                        labelText: 'Subject template',
                      ),
                    ),
                  TextField(
                    controller: body,
                    maxLines: 8,
                    decoration: const InputDecoration(
                      labelText: 'Body template',
                      alignLabelWithHint: true,
                    ),
                  ),
                  TextField(
                    controller: variables,
                    decoration: const InputDecoration(
                      labelText: 'Variable keys (comma-separated)',
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    if (submitted != true) return;
    final variableList = variables.text
        .split(',')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .map((item) => CommunicationTemplateVariable(key: item))
        .toList();
    try {
      final api = ref.read(communicationApiServiceProvider);
      if (template == null) {
        await api.createTemplate(
          templateKey: key.text.trim(),
          channel: channel,
          name: name.text.trim(),
          description: description.text.trim(),
          status: status,
          subjectTemplate: subject.text.trim(),
          bodyTemplate: body.text,
          variables: variableList,
        );
      } else {
        await api.updateTemplate(
          id: template.id,
          version: template.version,
          name: name.text.trim(),
          description: description.text.trim(),
          status: status,
          subjectTemplate: subject.text.trim(),
          bodyTemplate: body.text,
          variables: variableList,
        );
      }
      ref.invalidate(communicationTemplatesProvider);
      ref.invalidate(communicationDashboardProvider);
    } catch (error) {
      _showError(error);
    }
  }

  void _showError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('$error')));
  }
}
