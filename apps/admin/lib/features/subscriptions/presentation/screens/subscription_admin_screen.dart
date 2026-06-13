import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/subscription_query.dart';
import '../providers/subscription_providers.dart';

class SubscriptionAdminScreen extends ConsumerStatefulWidget {
  const SubscriptionAdminScreen({super.key});

  @override
  ConsumerState<SubscriptionAdminScreen> createState() =>
      _SubscriptionAdminScreenState();
}

class _SubscriptionAdminScreenState
    extends ConsumerState<SubscriptionAdminScreen> {
  late final TextEditingController _tenantController;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authNotifierProvider).user;
    _tenantController = TextEditingController(text: user?.tenantId ?? '');
  }

  @override
  void dispose() {
    _tenantController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).user;
    final isSuperAdmin = user?.hasRole(UserRole.superAdmin) == true;
    final tenantId = isSuperAdmin
        ? _tenantController.text.trim()
        : user?.tenantId ?? '';
    final tabs = <Tab>[
      if (isSuperAdmin)
        const Tab(icon: Icon(Icons.workspace_premium), text: 'Plans'),
      const Tab(icon: Icon(Icons.assignment_outlined), text: 'Subscription'),
      const Tab(icon: Icon(Icons.verified_user_outlined), text: 'Entitlements'),
      const Tab(icon: Icon(Icons.speed_outlined), text: 'Usage'),
      if (isSuperAdmin)
        const Tab(icon: Icon(Icons.timer_outlined), text: 'Trials'),
    ];
    final views = <Widget>[
      if (isSuperAdmin) const _PlansTab(),
      _SubscriptionTab(tenantId: tenantId, canManage: isSuperAdmin),
      _EntitlementsTab(tenantId: tenantId, canManage: isSuperAdmin),
      _UsageTab(tenantId: tenantId, canManage: isSuperAdmin),
      if (isSuperAdmin) _TrialsTab(tenantId: tenantId),
    ];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Subscription Administration'),
          bottom: TabBar(isScrollable: true, tabs: tabs),
        ),
        body: Column(
          children: <Widget>[
            _TenantScopeBar(
              controller: _tenantController,
              editable: isSuperAdmin,
              onChanged: () => setState(() {}),
            ),
            Expanded(child: TabBarView(children: views)),
          ],
        ),
      ),
    );
  }
}

class _TenantScopeBar extends StatelessWidget {
  const _TenantScopeBar({
    required this.controller,
    required this.editable,
    required this.onChanged,
  });

  final TextEditingController controller;
  final bool editable;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: controller,
        enabled: editable,
        decoration: InputDecoration(
          labelText: editable ? 'Tenant ID' : 'Current tenant',
          helperText: editable
              ? 'Super admins can inspect or manage any tenant by ID.'
              : 'Tenant admins can view their own subscription scope.',
          border: const OutlineInputBorder(),
          suffixIcon: editable
              ? IconButton(
                  onPressed: onChanged,
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh tenant scope',
                )
              : null,
        ),
        onSubmitted: (_) => onChanged(),
      ),
    );
  }
}

class _PlansTab extends ConsumerWidget {
  const _PlansTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = ref.watch(
      subscriptionPlansProvider(const SubscriptionPlanQuery(limit: 100)),
    );
    return _AsyncBody(
      value: plans,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () => _showPlanDialog(context, ref),
              icon: const Icon(Icons.add),
              label: const Text('Create Plan'),
            ),
          ),
          const SizedBox(height: 12),
          ...data.data.map((plan) => _PlanCard(plan: plan)),
        ],
      ),
    );
  }
}

class _PlanCard extends ConsumerWidget {
  const _PlanCard({required this.plan});

  final SubscriptionPlan plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(subscriptionRepositoryProvider);
    return Card(
      child: ExpansionTile(
        title: Text('${plan.name} (${plan.code} v${plan.versionNumber})'),
        subtitle: Text(
          '${plan.status.wireName} - ${plan.currencyCode} ${plan.priceMinor / 100} - version ${plan.version}',
        ),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: <Widget>[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: plan.features
                .map(
                  (feature) => Chip(
                    label: Text(
                      '${feature.featureKey}: ${feature.isEnabled ? 'on' : 'off'}'
                      '${feature.limitValue == null ? '' : ' / ${feature.limitValue}'}',
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: <Widget>[
              if (plan.status == SubscriptionPlanStatus.draft)
                FilledButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    () => repo.activatePlan(plan),
                    invalidatePlans: true,
                  ),
                  child: const Text('Activate'),
                ),
              if (plan.status == SubscriptionPlanStatus.active)
                OutlinedButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    () => repo.deactivatePlan(plan),
                    invalidatePlans: true,
                  ),
                  child: const Text('Deactivate'),
                ),
              if (plan.status == SubscriptionPlanStatus.draft)
                OutlinedButton(
                  onPressed: () => _showFeaturesDialog(context, ref, plan),
                  child: const Text('Replace Features'),
                ),
              OutlinedButton(
                onPressed: () => _showVersionsDialog(context, ref, plan.id),
                child: const Text('Versions'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SubscriptionTab extends ConsumerWidget {
  const _SubscriptionTab({required this.tenantId, required this.canManage});

  final String tenantId;
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (tenantId.isEmpty) return const _EmptyTenant();
    final query = TenantSubscriptionQuery(tenantId: tenantId, limit: 50);
    final subscriptions = ref.watch(tenantSubscriptionsProvider(query));
    final history = ref.watch(subscriptionHistoryProvider(tenantId));
    return _AsyncBody(
      value: subscriptions,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          if (canManage)
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () =>
                    _showActivateSubscriptionDialog(context, ref, tenantId),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Activate Subscription'),
              ),
            ),
          const SizedBox(height: 12),
          ...data.data.map(
            (subscription) => _SubscriptionCard(
              subscription: subscription,
              canManage: canManage,
            ),
          ),
          const Divider(height: 32),
          Text('History', style: Theme.of(context).textTheme.titleMedium),
          history.when(
            data: (events) => Column(
              children: events.data
                  .map(
                    (event) => ListTile(
                      title: Text(event.eventType),
                      subtitle: Text(
                        '${event.newPlan.code} v${event.newPlan.versionNumber}'
                        '${event.reason == null ? '' : ' - ${event.reason}'}',
                      ),
                      trailing: Text(_date(event.occurredAt)),
                    ),
                  )
                  .toList(),
            ),
            error: (error, _) => Text('History unavailable: $error'),
            loading: () => const LinearProgressIndicator(),
          ),
        ],
      ),
    );
  }
}

class _SubscriptionCard extends ConsumerWidget {
  const _SubscriptionCard({
    required this.subscription,
    required this.canManage,
  });

  final TenantSubscription subscription;
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(subscriptionRepositoryProvider);
    return Card(
      child: ListTile(
        title: Text(
          '${subscription.plan.name} (${subscription.plan.code} v${subscription.plan.versionNumber})',
        ),
        subtitle: Text(
          '${subscription.status.wireName} - starts ${_date(subscription.startsAt)}'
          '${subscription.endsAt == null ? '' : ' - ends ${_date(subscription.endsAt!)}'}',
        ),
        trailing: canManage
            ? PopupMenuButton<String>(
                onSelected: (value) async {
                  if (value == 'upgrade' || value == 'downgrade') {
                    await _showChangePlanDialog(
                      context,
                      ref,
                      subscription,
                      upgrade: value == 'upgrade',
                    );
                    return;
                  }
                  final command = switch (value) {
                    'suspend' => SubscriptionStatusCommand.suspend,
                    'resume' => SubscriptionStatusCommand.resume,
                    'expire' => SubscriptionStatusCommand.expire,
                    _ => SubscriptionStatusCommand.cancel,
                  };
                  await _run(
                    context,
                    ref,
                    () => repo.changeSubscriptionStatus(
                      subscription: subscription,
                      command: command,
                      reason: 'Updated from admin subscription center',
                    ),
                    invalidateTenantId: subscription.tenantId,
                  );
                },
                itemBuilder: (_) => const <PopupMenuEntry<String>>[
                  PopupMenuItem(value: 'upgrade', child: Text('Upgrade')),
                  PopupMenuItem(value: 'downgrade', child: Text('Downgrade')),
                  PopupMenuItem(value: 'suspend', child: Text('Suspend')),
                  PopupMenuItem(value: 'resume', child: Text('Resume')),
                  PopupMenuItem(value: 'expire', child: Text('Expire')),
                  PopupMenuItem(value: 'cancel', child: Text('Cancel')),
                ],
              )
            : null,
      ),
    );
  }
}

class _EntitlementsTab extends ConsumerWidget {
  const _EntitlementsTab({required this.tenantId, required this.canManage});

  final String tenantId;
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (tenantId.isEmpty) return const _EmptyTenant();
    final entitlements = ref.watch(tenantEntitlementsProvider(tenantId));
    return _AsyncBody(
      value: entitlements,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          if (canManage)
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () => _showEntitlementDialog(context, ref, tenantId),
                icon: const Icon(Icons.add),
                label: const Text('Set Override'),
              ),
            ),
          const SizedBox(height: 12),
          ...data.map(
            (item) => Card(
              child: ListTile(
                title: Text(item.featureKey),
                subtitle: Text(
                  '${item.enabled ? 'Enabled' : 'Disabled'} from ${item.source}'
                  '${item.limitValue == null ? '' : ' - limit ${item.limitValue}'}',
                ),
                trailing: canManage && item.override != null
                    ? TextButton(
                        onPressed: () => _run(
                          context,
                          ref,
                          () => ref
                              .read(subscriptionRepositoryProvider)
                              .revokeEntitlement(
                                tenantId: tenantId,
                                entitlement: item,
                                reason:
                                    'Revoked from admin subscription center',
                              ),
                          invalidateTenantId: tenantId,
                        ),
                        child: const Text('Revoke'),
                      )
                    : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UsageTab extends ConsumerWidget {
  const _UsageTab({required this.tenantId, required this.canManage});

  final String tenantId;
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (tenantId.isEmpty) return const _EmptyTenant();
    final counters = ref.watch(tenantUsageCountersProvider(tenantId));
    return _AsyncBody(
      value: counters,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          if (canManage)
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () => _showUsageDialog(context, ref, tenantId),
                icon: const Icon(Icons.tune),
                label: const Text('Adjust Usage'),
              ),
            ),
          const SizedBox(height: 12),
          ...data.map(
            (counter) => Card(
              child: ListTile(
                title: Text(counter.featureKey),
                subtitle: Text(
                  '${counter.period.wireName} ${counter.periodKey} - value ${counter.usageValue}',
                ),
                trailing: Text('v${counter.version}'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TrialsTab extends ConsumerWidget {
  const _TrialsTab({required this.tenantId});

  final String tenantId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (tenantId.isEmpty) return const _EmptyTenant();
    final trials = ref.watch(tenantTrialsProvider(tenantId));
    return _AsyncBody(
      value: trials,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Wrap(
            spacing: 8,
            children: <Widget>[
              FilledButton.icon(
                onPressed: () => _showStartTrialDialog(context, ref, tenantId),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Start Trial'),
              ),
              OutlinedButton.icon(
                onPressed: () => _run(
                  context,
                  ref,
                  () => ref
                      .read(subscriptionRepositoryProvider)
                      .expireDueTrials(),
                  invalidateTenantId: tenantId,
                ),
                icon: const Icon(Icons.schedule),
                label: const Text('Expire Due Trials'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...data.map((trial) => _TrialCard(trial: trial)),
        ],
      ),
    );
  }
}

class _TrialCard extends ConsumerWidget {
  const _TrialCard({required this.trial});

  final TrialSubscription trial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(subscriptionRepositoryProvider);
    return Card(
      child: ListTile(
        title: Text(
          '${trial.plan.name ?? trial.plan.code} (${trial.status.wireName})',
        ),
        subtitle: Text(
          'Ends ${_date(trial.endsAt)} - extended ${trial.extendedCount} times',
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) async {
            if (value == 'extend') {
              await _showExtendTrialDialog(context, ref, trial);
              return;
            }
            if (value == 'convert') {
              await _showConvertTrialDialog(context, ref, trial);
              return;
            }
            await _run(
              context,
              ref,
              () => repo.expireTrial(
                trial,
                reason: 'Expired from admin subscription center',
              ),
              invalidateTenantId: trial.tenantId,
            );
          },
          itemBuilder: (_) => const <PopupMenuEntry<String>>[
            PopupMenuItem(value: 'extend', child: Text('Extend')),
            PopupMenuItem(value: 'convert', child: Text('Convert')),
            PopupMenuItem(value: 'expire', child: Text('Expire')),
          ],
        ),
      ),
    );
  }
}

class _AsyncBody<T> extends StatelessWidget {
  const _AsyncBody({required this.value, required this.builder});

  final AsyncValue<T> value;
  final Widget Function(T data) builder;

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: builder,
      error: (error, _) => Center(child: Text('Unable to load data: $error')),
      loading: () => const Center(child: CircularProgressIndicator()),
    );
  }
}

class _EmptyTenant extends StatelessWidget {
  const _EmptyTenant();

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Enter a tenant ID to load this screen.'));
  }
}

Future<void> _showPlanDialog(BuildContext context, WidgetRef ref) async {
  final code = TextEditingController();
  final name = TextEditingController();
  final price = TextEditingController(text: '0');
  final currency = TextEditingController(text: 'INR');
  final feature = TextEditingController();
  var interval = SubscriptionBillingInterval.monthly;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Create Subscription Plan'),
        content: _DialogFields(
          children: <Widget>[
            TextField(
              controller: code,
              decoration: const InputDecoration(labelText: 'Code'),
            ),
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            DropdownButtonFormField<SubscriptionBillingInterval>(
              initialValue: interval,
              items: SubscriptionBillingInterval.values
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Text(item.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (value) =>
                  setState(() => interval = value ?? interval),
              decoration: const InputDecoration(labelText: 'Billing interval'),
            ),
            TextField(
              controller: price,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Price minor units'),
            ),
            TextField(
              controller: currency,
              decoration: const InputDecoration(labelText: 'Currency code'),
            ),
            TextField(
              controller: feature,
              decoration: const InputDecoration(
                labelText: 'Initial feature keys',
                helperText: 'Comma-separated, enabled by default.',
              ),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final features = feature.text
                  .split(',')
                  .map((value) => value.trim())
                  .where((value) => value.isNotEmpty)
                  .map(
                    (value) => SubscriptionPlanFeature(
                      featureKey: value,
                      isEnabled: true,
                    ),
                  )
                  .toList();
              await _run(
                context,
                ref,
                () => ref
                    .read(subscriptionRepositoryProvider)
                    .createPlan(
                      code: code.text,
                      name: name.text,
                      billingInterval: interval,
                      priceMinor: int.tryParse(price.text) ?? 0,
                      currencyCode: currency.text,
                      features: features,
                    ),
                invalidatePlans: true,
              );
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    ),
  );
}

Future<void> _showFeaturesDialog(
  BuildContext context,
  WidgetRef ref,
  SubscriptionPlan plan,
) async {
  final features = TextEditingController(
    text: plan.features.map((item) => item.featureKey).join(', '),
  );
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Replace Plan Features'),
      content: TextField(
        controller: features,
        decoration: const InputDecoration(
          labelText: 'Feature keys',
          helperText: 'Comma-separated, enabled by default.',
        ),
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () async {
            final items = features.text
                .split(',')
                .map((value) => value.trim())
                .where((value) => value.isNotEmpty)
                .map(
                  (value) => SubscriptionPlanFeature(
                    featureKey: value,
                    isEnabled: true,
                  ),
                )
                .toList();
            await _run(
              context,
              ref,
              () => ref
                  .read(subscriptionRepositoryProvider)
                  .replacePlanFeatures(plan, items),
              invalidatePlans: true,
            );
            if (dialogContext.mounted) Navigator.pop(dialogContext);
          },
          child: const Text('Save'),
        ),
      ],
    ),
  );
}

Future<void> _showVersionsDialog(
  BuildContext context,
  WidgetRef ref,
  String planId,
) async {
  await showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Plan Versions'),
      content: SizedBox(
        width: 520,
        child: Consumer(
          builder: (context, ref, _) {
            final versions = ref.watch(
              subscriptionPlanVersionsProvider(planId),
            );
            return versions.when(
              data: (items) => Column(
                mainAxisSize: MainAxisSize.min,
                children: items
                    .map(
                      (item) => ListTile(
                        title: Text('${item.code} v${item.versionNumber}'),
                        subtitle: Text(
                          '${item.status.wireName} - v${item.version}',
                        ),
                      ),
                    )
                    .toList(),
              ),
              error: (error, _) => Text('Unable to load versions: $error'),
              loading: () => const LinearProgressIndicator(),
            );
          },
        ),
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );
}

Future<void> _showActivateSubscriptionDialog(
  BuildContext context,
  WidgetRef ref,
  String tenantId,
) async {
  final activePlans = await ref.read(activeSubscriptionPlansProvider.future);
  if (!context.mounted) return;
  String? selectedPlanId = activePlans.isEmpty ? null : activePlans.first.id;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Activate Tenant Subscription'),
        content: DropdownButtonFormField<String>(
          initialValue: selectedPlanId,
          items: activePlans
              .map(
                (plan) => DropdownMenuItem(
                  value: plan.id,
                  child: Text(
                    '${plan.name} (${plan.code} v${plan.versionNumber})',
                  ),
                ),
              )
              .toList(),
          onChanged: (value) => setState(() => selectedPlanId = value),
          decoration: const InputDecoration(labelText: 'Active plan version'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: selectedPlanId == null
                ? null
                : () async {
                    await _run(
                      context,
                      ref,
                      () => ref
                          .read(subscriptionRepositoryProvider)
                          .activateSubscription(
                            tenantId: tenantId,
                            planId: selectedPlanId!,
                          ),
                      invalidateTenantId: tenantId,
                    );
                    if (dialogContext.mounted) Navigator.pop(dialogContext);
                  },
            child: const Text('Activate'),
          ),
        ],
      ),
    ),
  );
}

Future<void> _showChangePlanDialog(
  BuildContext context,
  WidgetRef ref,
  TenantSubscription subscription, {
  required bool upgrade,
}) async {
  final plans = await ref.read(activeSubscriptionPlansProvider.future);
  if (!context.mounted) return;
  String? selectedPlanId = plans.isEmpty ? null : plans.first.id;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: Text(
          upgrade ? 'Upgrade Subscription' : 'Downgrade Subscription',
        ),
        content: DropdownButtonFormField<String>(
          initialValue: selectedPlanId,
          items: plans
              .map(
                (plan) => DropdownMenuItem(
                  value: plan.id,
                  child: Text(
                    '${plan.name} (${plan.code} v${plan.versionNumber})',
                  ),
                ),
              )
              .toList(),
          onChanged: (value) => setState(() => selectedPlanId = value),
          decoration: const InputDecoration(labelText: 'Target active plan'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: selectedPlanId == null
                ? null
                : () async {
                    await _run(
                      context,
                      ref,
                      () => ref
                          .read(subscriptionRepositoryProvider)
                          .changeSubscriptionPlan(
                            subscription: subscription,
                            planId: selectedPlanId!,
                            upgrade: upgrade,
                            reason: 'Changed from admin subscription center',
                          ),
                      invalidateTenantId: subscription.tenantId,
                    );
                    if (dialogContext.mounted) Navigator.pop(dialogContext);
                  },
            child: const Text('Save'),
          ),
        ],
      ),
    ),
  );
}

Future<void> _showEntitlementDialog(
  BuildContext context,
  WidgetRef ref,
  String tenantId,
) async {
  final feature = TextEditingController();
  final limit = TextEditingController();
  var enabled = true;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Set Entitlement Override'),
        content: _DialogFields(
          children: <Widget>[
            TextField(
              controller: feature,
              decoration: const InputDecoration(labelText: 'Feature key'),
            ),
            SwitchListTile(
              value: enabled,
              onChanged: (value) => setState(() => enabled = value),
              title: const Text('Enabled'),
            ),
            TextField(
              controller: limit,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Optional limit'),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              await _run(
                context,
                ref,
                () => ref
                    .read(subscriptionRepositoryProvider)
                    .upsertEntitlement(
                      tenantId: tenantId,
                      featureKey: feature.text,
                      isEnabled: enabled,
                      limitValue: int.tryParse(limit.text),
                      reason: 'Updated from admin subscription center',
                    ),
                invalidateTenantId: tenantId,
              );
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    ),
  );
}

Future<void> _showUsageDialog(
  BuildContext context,
  WidgetRef ref,
  String tenantId,
) async {
  final feature = TextEditingController();
  final value = TextEditingController(text: '0');
  var period = UsageCounterPeriod.lifetime;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Adjust Usage Counter'),
        content: _DialogFields(
          children: <Widget>[
            TextField(
              controller: feature,
              decoration: const InputDecoration(labelText: 'Feature key'),
            ),
            DropdownButtonFormField<UsageCounterPeriod>(
              initialValue: period,
              items: UsageCounterPeriod.values
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Text(item.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => period = value ?? period),
              decoration: const InputDecoration(labelText: 'Period'),
            ),
            TextField(
              controller: value,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Usage value'),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              await _run(
                context,
                ref,
                () => ref
                    .read(subscriptionRepositoryProvider)
                    .adjustUsage(
                      tenantId: tenantId,
                      featureKey: feature.text,
                      usageValue: value.text,
                      period: period,
                      reason: 'Adjusted from admin subscription center',
                    ),
                invalidateTenantId: tenantId,
              );
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    ),
  );
}

Future<void> _showStartTrialDialog(
  BuildContext context,
  WidgetRef ref,
  String tenantId,
) async {
  final plans = await ref.read(activeSubscriptionPlansProvider.future);
  if (!context.mounted) return;
  String? selectedPlanId = plans.isEmpty ? null : plans.first.id;
  final endsAt = TextEditingController(
    text: DateTime.now()
        .toUtc()
        .add(const Duration(days: 14))
        .toIso8601String(),
  );
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Start Trial'),
        content: _DialogFields(
          children: <Widget>[
            DropdownButtonFormField<String>(
              initialValue: selectedPlanId,
              items: plans
                  .map(
                    (plan) => DropdownMenuItem(
                      value: plan.id,
                      child: Text(
                        '${plan.name} (${plan.code} v${plan.versionNumber})',
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => selectedPlanId = value),
              decoration: const InputDecoration(labelText: 'Trial plan'),
            ),
            TextField(
              controller: endsAt,
              decoration: const InputDecoration(labelText: 'Ends at UTC ISO'),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: selectedPlanId == null
                ? null
                : () async {
                    await _run(
                      context,
                      ref,
                      () => ref
                          .read(subscriptionRepositoryProvider)
                          .startTrial(
                            tenantId: tenantId,
                            planId: selectedPlanId!,
                            endsAt: DateTime.parse(endsAt.text),
                            reason: 'Started from admin subscription center',
                          ),
                      invalidateTenantId: tenantId,
                    );
                    if (dialogContext.mounted) Navigator.pop(dialogContext);
                  },
            child: const Text('Start'),
          ),
        ],
      ),
    ),
  );
}

Future<void> _showExtendTrialDialog(
  BuildContext context,
  WidgetRef ref,
  TrialSubscription trial,
) async {
  final endsAt = TextEditingController(
    text: trial.endsAt.add(const Duration(days: 7)).toIso8601String(),
  );
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Extend Trial'),
      content: TextField(
        controller: endsAt,
        decoration: const InputDecoration(labelText: 'New ends at UTC ISO'),
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () async {
            await _run(
              context,
              ref,
              () => ref
                  .read(subscriptionRepositoryProvider)
                  .extendTrial(
                    trial: trial,
                    endsAt: DateTime.parse(endsAt.text),
                    reason: 'Extended from admin subscription center',
                  ),
              invalidateTenantId: trial.tenantId,
            );
            if (dialogContext.mounted) Navigator.pop(dialogContext);
          },
          child: const Text('Extend'),
        ),
      ],
    ),
  );
}

Future<void> _showConvertTrialDialog(
  BuildContext context,
  WidgetRef ref,
  TrialSubscription trial,
) async {
  final plans = await ref.read(activeSubscriptionPlansProvider.future);
  if (!context.mounted) return;
  String? selectedPlanId = plans.isEmpty ? null : plans.first.id;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Convert Trial'),
        content: DropdownButtonFormField<String>(
          initialValue: selectedPlanId,
          items: plans
              .map(
                (plan) => DropdownMenuItem(
                  value: plan.id,
                  child: Text(
                    '${plan.name} (${plan.code} v${plan.versionNumber})',
                  ),
                ),
              )
              .toList(),
          onChanged: (value) => setState(() => selectedPlanId = value),
          decoration: const InputDecoration(labelText: 'Paid plan'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: selectedPlanId == null
                ? null
                : () async {
                    await _run(
                      context,
                      ref,
                      () => ref
                          .read(subscriptionRepositoryProvider)
                          .convertTrial(
                            trial: trial,
                            planId: selectedPlanId!,
                            reason: 'Converted from admin subscription center',
                          ),
                      invalidateTenantId: trial.tenantId,
                    );
                    if (dialogContext.mounted) Navigator.pop(dialogContext);
                  },
            child: const Text('Convert'),
          ),
        ],
      ),
    ),
  );
}

class _DialogFields extends StatelessWidget {
  const _DialogFields({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 420,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: children
              .map(
                (child) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: child,
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}

Future<void> _run<T>(
  BuildContext context,
  WidgetRef ref,
  Future<T> Function() action, {
  bool invalidatePlans = false,
  String? invalidateTenantId,
}) async {
  try {
    await action();
    if (invalidatePlans) {
      ref.invalidate(subscriptionPlansProvider);
      ref.invalidate(activeSubscriptionPlansProvider);
    }
    if (invalidateTenantId != null) {
      ref.invalidate(tenantSubscriptionsProvider);
      ref.invalidate(currentTenantSubscriptionProvider(invalidateTenantId));
      ref.invalidate(subscriptionHistoryProvider(invalidateTenantId));
      ref.invalidate(tenantEntitlementsProvider(invalidateTenantId));
      ref.invalidate(tenantUsageCountersProvider(invalidateTenantId));
      ref.invalidate(tenantTrialsProvider(invalidateTenantId));
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subscription change saved.')),
      );
    }
  } on Object catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Subscription change failed: $error')),
      );
    }
  }
}

String _date(DateTime value) => value.toLocal().toString().split('.').first;
