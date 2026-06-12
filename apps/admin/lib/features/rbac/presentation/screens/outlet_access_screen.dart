import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/rbac_providers.dart';

class OutletAccessScreen extends ConsumerStatefulWidget {
  const OutletAccessScreen({required this.user, super.key});
  final AppUser user;
  @override
  ConsumerState<OutletAccessScreen> createState() => _OutletAccessScreenState();
}

class _OutletAccessScreenState extends ConsumerState<OutletAccessScreen> {
  late final Set<String> _selected;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.user.outlets.map((outlet) => outlet.id).toSet();
  }

  @override
  Widget build(BuildContext context) {
    final outlets = ref.watch(rbacOutletsProvider);
    return Scaffold(
      appBar: AppBar(title: Text('${widget.user.name} Outlet Access')),
      body: outlets.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (items) => ListView(
          children: [
            CheckboxListTile(
              value: items.isNotEmpty && _selected.length == items.length,
              tristate: true,
              title: const Text('All outlets'),
              onChanged: (checked) => setState(() {
                if (checked ?? false) {
                  _selected.addAll(items.map((outlet) => outlet.id));
                } else {
                  _selected.clear();
                }
              }),
            ),
            for (final outlet in items)
              CheckboxListTile(
                value: _selected.contains(outlet.id),
                title: Text(outlet.name),
                subtitle: Text(outlet.code),
                onChanged: (checked) => setState(
                  () => checked ?? false
                      ? _selected.add(outlet.id)
                      : _selected.remove(outlet.id),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _saving ? null : _save,
        icon: const Icon(Icons.save),
        label: const Text('Save'),
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref
          .read(rbacRepositoryProvider)
          .assignUserOutlets(widget.user.id, _selected.toList());
      ref.invalidate(userDetailsProvider(widget.user.id));
      ref.invalidate(userAccessProvider(widget.user.id));
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
