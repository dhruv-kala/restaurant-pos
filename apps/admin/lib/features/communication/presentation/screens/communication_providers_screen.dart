import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/communication_providers.dart';

class CommunicationProvidersScreen extends ConsumerWidget {
  const CommunicationProvidersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;
    final canManage =
        user?.hasRole(UserRole.superAdmin) == true ||
        user?.hasRole(UserRole.tenantAdmin) == true ||
        user?.hasPermission('communication.provider_manage') == true;
    final providers = ref.watch(communicationProvidersListProvider);
    return Scaffold(
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => _edit(context, ref),
              icon: const Icon(Icons.add),
              label: const Text('Add provider'),
            )
          : null,
      body: providers.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (page) => page.data.isEmpty
            ? const Center(
                child: Text('No communication providers configured.'),
              )
            : RefreshIndicator(
                onRefresh: () =>
                    ref.refresh(communicationProvidersListProvider.future),
                child: ListView.separated(
                  itemCount: page.data.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final provider = page.data[index];
                    return ListTile(
                      leading: Icon(
                        provider.status == CommunicationProviderStatus.active
                            ? Icons.health_and_safety_outlined
                            : Icons.pause_circle_outline,
                      ),
                      title: Text(provider.displayName),
                      subtitle: Text(
                        '${provider.channel.wireName} | '
                        '${provider.providerKey} | priority ${provider.priority}',
                      ),
                      trailing: Chip(label: Text(provider.status.wireName)),
                      onTap: canManage
                          ? () => _edit(context, ref, provider)
                          : null,
                    );
                  },
                ),
              ),
      ),
    );
  }

  Future<void> _edit(
    BuildContext context,
    WidgetRef ref, [
    CommunicationProvider? provider,
  ]) async {
    final key = TextEditingController(text: provider?.providerKey);
    final name = TextEditingController(text: provider?.displayName);
    final priority = TextEditingController(
      text: '${provider?.priority ?? 100}',
    );
    final secret = TextEditingController(text: provider?.secretReference);
    final config = TextEditingController(
      text: const JsonEncoder.withIndent(
        '  ',
      ).convert(provider?.configMetadata ?? <String, dynamic>{}),
    );
    final capabilities = TextEditingController(
      text: const JsonEncoder.withIndent(
        '  ',
      ).convert(provider?.capabilities ?? <String, dynamic>{}),
    );
    var channel = provider?.channel ?? CommunicationChannel.email;
    var status = provider?.status ?? CommunicationProviderStatus.inactive;
    final submitted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(provider == null ? 'Add provider' : 'Edit provider'),
          content: SizedBox(
            width: 680,
            child: SingleChildScrollView(
              child: Column(
                children: [
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
                    onChanged: provider == null
                        ? (value) => setState(() => channel = value ?? channel)
                        : null,
                  ),
                  TextField(
                    controller: key,
                    enabled: provider == null,
                    decoration: const InputDecoration(
                      labelText: 'Provider key',
                    ),
                  ),
                  TextField(
                    controller: name,
                    decoration: const InputDecoration(
                      labelText: 'Display name',
                    ),
                  ),
                  DropdownButtonFormField(
                    initialValue: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: CommunicationProviderStatus.values
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
                  TextField(
                    controller: priority,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Priority'),
                  ),
                  TextField(
                    controller: secret,
                    decoration: const InputDecoration(
                      labelText: 'Secret environment reference',
                      hintText: 'env:TWILIO_AUTH_TOKEN',
                    ),
                  ),
                  TextField(
                    controller: config,
                    maxLines: 8,
                    decoration: const InputDecoration(
                      labelText: 'Configuration JSON',
                      alignLabelWithHint: true,
                    ),
                  ),
                  TextField(
                    controller: capabilities,
                    maxLines: 5,
                    decoration: const InputDecoration(
                      labelText: 'Capabilities JSON',
                      alignLabelWithHint: true,
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
    try {
      final configValue = _jsonObject(config.text);
      final capabilityValue = _jsonObject(capabilities.text);
      final api = ref.read(communicationApiServiceProvider);
      if (provider == null) {
        await api.createProvider(
          channel: channel,
          providerKey: key.text.trim(),
          displayName: name.text.trim(),
          status: status,
          priority: int.parse(priority.text),
          secretReference: secret.text.trim(),
          configMetadata: configValue,
          capabilities: capabilityValue,
        );
      } else {
        await api.updateProvider(
          id: provider.id,
          version: provider.version,
          displayName: name.text.trim(),
          status: status,
          priority: int.parse(priority.text),
          secretReference: secret.text.trim(),
          configMetadata: configValue,
          capabilities: capabilityValue,
        );
      }
      ref.invalidate(communicationProvidersListProvider);
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Map<String, dynamic> _jsonObject(String value) {
    final decoded = jsonDecode(value);
    if (decoded is! Map) throw const FormatException('Expected a JSON object.');
    return Map<String, dynamic>.from(decoded);
  }
}
