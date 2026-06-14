import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/promotions_query.dart';
import '../providers/promotions_providers.dart';

class PromotionsAdminScreen extends ConsumerStatefulWidget {
  const PromotionsAdminScreen({super.key});

  @override
  ConsumerState<PromotionsAdminScreen> createState() =>
      _PromotionsAdminScreenState();
}

class _PromotionsAdminScreenState extends ConsumerState<PromotionsAdminScreen> {
  late final TextEditingController _tenantController;
  late final TextEditingController _outletController;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authNotifierProvider).user;
    _tenantController = TextEditingController(text: user?.tenantId ?? '');
    _outletController = TextEditingController(text: '');
  }

  @override
  void dispose() {
    _tenantController.dispose();
    _outletController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).user;
    final isSuperAdmin = user?.hasRole(UserRole.superAdmin) == true;
    final tenantId = isSuperAdmin
        ? _tenantController.text.trim()
        : user?.tenantId ?? '';
    final outletId = _emptyToNull(_outletController.text);
    final scope = PromotionUiScope(tenantId: tenantId, outletId: outletId);
    return DefaultTabController(
      length: 6,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Promotions'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: <Tab>[
              Tab(icon: Icon(Icons.dashboard_outlined), text: 'Dashboard'),
              Tab(icon: Icon(Icons.policy_outlined), text: 'Policies'),
              Tab(
                icon: Icon(Icons.confirmation_number_outlined),
                text: 'Coupons',
              ),
              Tab(icon: Icon(Icons.campaign_outlined), text: 'Campaigns'),
              Tab(icon: Icon(Icons.calculate_outlined), text: 'Preview'),
              Tab(icon: Icon(Icons.history_outlined), text: 'Redemptions'),
            ],
          ),
        ),
        body: Column(
          children: <Widget>[
            _ScopeBar(
              tenantController: _tenantController,
              outletController: _outletController,
              tenantEditable: isSuperAdmin,
              onChanged: () => setState(() {}),
            ),
            Expanded(
              child: tenantId.isEmpty
                  ? const _EmptyScope()
                  : TabBarView(
                      children: <Widget>[
                        _DashboardTab(scope: scope),
                        _PoliciesTab(scope: scope),
                        _CouponsTab(scope: scope),
                        _CampaignsTab(scope: scope),
                        _PreviewTab(scope: scope),
                        _RedemptionsTab(scope: scope),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class PromotionUiScope {
  const PromotionUiScope({required this.tenantId, this.outletId});

  final String tenantId;
  final String? outletId;
}

class _ScopeBar extends StatelessWidget {
  const _ScopeBar({
    required this.tenantController,
    required this.outletController,
    required this.tenantEditable,
    required this.onChanged,
  });

  final TextEditingController tenantController;
  final TextEditingController outletController;
  final bool tenantEditable;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Wrap(
        spacing: 12,
        runSpacing: 12,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          SizedBox(
            width: 360,
            child: TextField(
              controller: tenantController,
              enabled: tenantEditable,
              decoration: InputDecoration(
                labelText: tenantEditable ? 'Tenant ID' : 'Current tenant',
                border: const OutlineInputBorder(),
              ),
              onSubmitted: (_) => onChanged(),
            ),
          ),
          SizedBox(
            width: 300,
            child: TextField(
              controller: outletController,
              decoration: const InputDecoration(
                labelText: 'Outlet filter',
                helperText: 'Optional outlet ID.',
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => onChanged(),
            ),
          ),
          FilledButton.icon(
            onPressed: onChanged,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
          ),
        ],
      ),
    );
  }
}

class _DashboardTab extends ConsumerWidget {
  const _DashboardTab({required this.scope});

  final PromotionUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final policies = ref.watch(
      discountPoliciesProvider(
        DiscountPolicyQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          status: DiscountPolicyStatus.active,
          limit: 100,
        ),
      ),
    );
    final coupons = ref.watch(
      couponsProvider(
        CouponQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          status: CouponStatus.active,
          limit: 100,
        ),
      ),
    );
    final campaigns = ref.watch(
      promotionCampaignsProvider(
        PromotionCampaignQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          status: PromotionCampaignStatus.active,
          limit: 100,
        ),
      ),
    );
    final redemptions = ref.watch(
      promotionRedemptionsProvider(
        PromotionRedemptionQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          limit: 100,
        ),
      ),
    );
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: <Widget>[
            _MetricCard(
              title: 'Active policies',
              value: policies.when(
                data: (value) => value.meta.total.toString(),
                error: (_, _) => '-',
                loading: () => '...',
              ),
            ),
            _MetricCard(
              title: 'Active coupons',
              value: coupons.when(
                data: (value) => value.meta.total.toString(),
                error: (_, _) => '-',
                loading: () => '...',
              ),
            ),
            _MetricCard(
              title: 'Active campaigns',
              value: campaigns.when(
                data: (value) => value.meta.total.toString(),
                error: (_, _) => '-',
                loading: () => '...',
              ),
            ),
            _MetricCard(
              title: 'Today discount',
              value: redemptions.when(
                data: (value) => _money(
                  value.data
                      .where((item) => _isToday(item.redeemedAt))
                      .fold<int>(
                        0,
                        (total, item) => total + item.discountAmountMinor,
                      ),
                  value.data.isEmpty ? 'INR' : value.data.first.currencyCode,
                ),
                error: (_, _) => '-',
                loading: () => '...',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _AsyncBody(
          value: redemptions,
          builder: (data) {
            final today = data.data
                .where((item) => _isToday(item.redeemedAt))
                .toList(growable: false);
            return Card(
              child: ListTile(
                title: Text('Redemptions today: ${today.length}'),
                subtitle: const Text(
                  'This dashboard uses the current redemption history page.',
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _PoliciesTab extends ConsumerWidget {
  const _PoliciesTab({required this.scope});

  final PromotionUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = DiscountPolicyQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      limit: 100,
    );
    final policies = ref.watch(discountPoliciesProvider(query));
    return _AsyncBody(
      value: policies,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () => _showPolicyDialog(context, ref, scope),
              icon: const Icon(Icons.add),
              label: const Text('Create Policy'),
            ),
          ),
          const SizedBox(height: 12),
          ...data.data.map((policy) => _PolicyCard(policy: policy)),
        ],
      ),
    );
  }
}

class _PolicyCard extends ConsumerWidget {
  const _PolicyCard({required this.policy});

  final DiscountPolicy policy;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListTile(
        title: Text('${policy.name} (${policy.code})'),
        subtitle: Text(
          '${policy.scope.wireName} - ${_discountDescription(policy.valueType, policy.percentageBps, policy.amountMinor, policy.currencyCode)} - version ${policy.version}',
        ),
        trailing: Wrap(
          spacing: 8,
          children: <Widget>[
            Chip(label: Text(policy.status.wireName)),
            OutlinedButton(
              onPressed: () => _run(
                context,
                ref,
                () => ref
                    .read(promotionsRepositoryProvider)
                    .changeDiscountPolicyStatus(
                      policy,
                      policy.status == DiscountPolicyStatus.active
                          ? DiscountPolicyStatus.inactive
                          : DiscountPolicyStatus.active,
                    ),
              ),
              child: Text(
                policy.status == DiscountPolicyStatus.active
                    ? 'Deactivate'
                    : 'Activate',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CouponsTab extends ConsumerWidget {
  const _CouponsTab({required this.scope});

  final PromotionUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coupons = ref.watch(
      couponsProvider(
        CouponQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          limit: 100,
        ),
      ),
    );
    return _AsyncBody(
      value: coupons,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () => _showCouponDialog(context, ref, scope),
              icon: const Icon(Icons.add),
              label: const Text('Create Coupon'),
            ),
          ),
          const SizedBox(height: 12),
          ...data.data.map((coupon) => _CouponCard(coupon: coupon)),
        ],
      ),
    );
  }
}

class _CouponCard extends ConsumerWidget {
  const _CouponCard({required this.coupon});

  final Coupon coupon;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final limit = coupon.totalUsageLimit == null
        ? 'unlimited'
        : coupon.totalUsageLimit.toString();
    return Card(
      child: ListTile(
        title: Text('${coupon.code} - ${coupon.name}'),
        subtitle: Text(
          '${coupon.couponType.wireName} - ${_window(coupon.startsAt, coupon.endsAt)} - usage ${coupon.currentUsageCount}/$limit',
        ),
        trailing: Wrap(
          spacing: 8,
          children: <Widget>[
            Chip(label: Text(coupon.status.wireName)),
            OutlinedButton(
              onPressed: () => _run(
                context,
                ref,
                () => ref
                    .read(promotionsRepositoryProvider)
                    .changeCouponStatus(
                      coupon,
                      coupon.status == CouponStatus.active
                          ? CouponStatus.inactive
                          : CouponStatus.active,
                    ),
              ),
              child: Text(
                coupon.status == CouponStatus.active
                    ? 'Deactivate'
                    : 'Activate',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CampaignsTab extends ConsumerWidget {
  const _CampaignsTab({required this.scope});

  final PromotionUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaigns = ref.watch(
      promotionCampaignsProvider(
        PromotionCampaignQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          limit: 100,
        ),
      ),
    );
    return _AsyncBody(
      value: campaigns,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () => _showCampaignDialog(context, ref, scope),
              icon: const Icon(Icons.add),
              label: const Text('Create Campaign'),
            ),
          ),
          const SizedBox(height: 12),
          ...data.data.map((campaign) => _CampaignCard(campaign: campaign)),
        ],
      ),
    );
  }
}

class _CampaignCard extends ConsumerWidget {
  const _CampaignCard({required this.campaign});

  final PromotionCampaign campaign;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ExpansionTile(
        title: Text('${campaign.name} (${campaign.code})'),
        subtitle: Text(
          '${campaign.status.wireName} - ${campaign.outletScope.wireName} - ${_window(campaign.startsAt, campaign.endsAt)}',
        ),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: <Widget>[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: campaign.rules
                .map(
                  (rule) => Chip(
                    label: Text('${rule.name}: ${rule.ruleType.wireName}'),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: <Widget>[
              if (campaign.status != PromotionCampaignStatus.active)
                FilledButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    () => ref
                        .read(promotionsRepositoryProvider)
                        .activateCampaign(campaign),
                  ),
                  child: const Text('Activate'),
                ),
              if (campaign.status == PromotionCampaignStatus.active)
                OutlinedButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    () => ref
                        .read(promotionsRepositoryProvider)
                        .deactivateCampaign(campaign),
                  ),
                  child: const Text('Deactivate'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PreviewTab extends ConsumerStatefulWidget {
  const _PreviewTab({required this.scope});

  final PromotionUiScope scope;

  @override
  ConsumerState<_PreviewTab> createState() => _PreviewTabState();
}

class _PreviewTabState extends ConsumerState<_PreviewTab> {
  final _subtotal = TextEditingController(text: '10000');
  final _currency = TextEditingController(text: 'INR');
  final _couponCodes = TextEditingController();
  DiscountPreviewRequest? _request;

  @override
  void dispose() {
    _subtotal.dispose();
    _currency.dispose();
    _couponCodes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final request = _request;
    final preview = request == null
        ? null
        : ref.watch(discountPreviewProvider(request));
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        _DialogFields(
          children: <Widget>[
            TextField(
              controller: _subtotal,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Subtotal minor units',
                border: OutlineInputBorder(),
              ),
            ),
            TextField(
              controller: _currency,
              decoration: const InputDecoration(
                labelText: 'Currency code',
                border: OutlineInputBorder(),
              ),
            ),
            TextField(
              controller: _couponCodes,
              decoration: const InputDecoration(
                labelText: 'Coupon codes',
                helperText: 'Comma-separated.',
                border: OutlineInputBorder(),
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () {
                  setState(() {
                    _request = DiscountPreviewRequest(
                      tenantId: widget.scope.tenantId,
                      outletId: widget.scope.outletId,
                      subtotalMinor: int.tryParse(_subtotal.text) ?? 0,
                      currencyCode: _currency.text.trim().toUpperCase(),
                      couponCodes: _splitCsv(_couponCodes.text),
                    );
                  });
                },
                icon: const Icon(Icons.play_arrow),
                label: const Text('Evaluate'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (preview != null)
          _AsyncBody(
            value: preview,
            builder: (data) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                _CandidateSection(title: 'Selected', items: data.selected),
                _CandidateSection(title: 'Eligible', items: data.eligible),
                _CandidateSection(title: 'Rejected', items: data.rejected),
              ],
            ),
          ),
      ],
    );
  }
}

class _CandidateSection extends StatelessWidget {
  const _CandidateSection({required this.title, required this.items});

  final String title;
  final List<DiscountEligibilityCandidate> items;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        initiallyExpanded: title == 'Selected',
        title: Text('$title (${items.length})'),
        children: items.isEmpty
            ? <Widget>[const ListTile(title: Text('No candidates.'))]
            : items
                  .map(
                    (item) => ListTile(
                      title: Text('${item.name} (${item.code})'),
                      subtitle: Text(
                        item.reasons.isEmpty
                            ? item.source.wireName
                            : item.reasons.join(', '),
                      ),
                      trailing: Text(
                        item.calculation == null
                            ? '-'
                            : _money(
                                item.calculation!.discountAmountMinor,
                                item.calculation!.currencyCode,
                              ),
                      ),
                    ),
                  )
                  .toList(),
      ),
    );
  }
}

class _RedemptionsTab extends ConsumerWidget {
  const _RedemptionsTab({required this.scope});

  final PromotionUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final redemptions = ref.watch(
      promotionRedemptionsProvider(
        PromotionRedemptionQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          limit: 100,
        ),
      ),
    );
    return _AsyncBody(
      value: redemptions,
      builder: (data) => ListView(
        padding: const EdgeInsets.all(16),
        children: data.data
            .map(
              (redemption) => Card(
                child: ListTile(
                  title: Text(
                    '${redemption.codeSnapshot} - ${redemption.nameSnapshot}',
                  ),
                  subtitle: Text(
                    '${redemption.source.wireName} - bill ${redemption.billId} - ${_date(redemption.redeemedAt)}',
                  ),
                  trailing: Text(
                    _money(
                      redemption.discountAmountMinor,
                      redemption.currencyCode,
                    ),
                  ),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              Text(value, style: Theme.of(context).textTheme.headlineSmall),
            ],
          ),
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

class _EmptyScope extends StatelessWidget {
  const _EmptyScope();

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Enter a tenant ID to load promotions.'));
  }
}

class _DialogFields extends StatelessWidget {
  const _DialogFields({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 460,
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

Future<void> _showPolicyDialog(
  BuildContext context,
  WidgetRef ref,
  PromotionUiScope scope,
) async {
  final code = TextEditingController();
  final name = TextEditingController();
  final value = TextEditingController();
  final currency = TextEditingController(text: 'INR');
  var discountScope = DiscountScope.bill;
  var valueType = PromotionDiscountValueType.percentage;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Create Discount Policy'),
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
            DropdownButtonFormField<DiscountScope>(
              initialValue: discountScope,
              items: DiscountScope.values
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Text(item.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (item) =>
                  setState(() => discountScope = item ?? discountScope),
              decoration: const InputDecoration(labelText: 'Scope'),
            ),
            DropdownButtonFormField<PromotionDiscountValueType>(
              initialValue: valueType,
              items: PromotionDiscountValueType.values
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Text(item.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (item) =>
                  setState(() => valueType = item ?? valueType),
              decoration: const InputDecoration(labelText: 'Value type'),
            ),
            TextField(
              controller: value,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: valueType == PromotionDiscountValueType.percentage
                    ? 'Percentage bps'
                    : 'Amount minor units',
              ),
            ),
            TextField(
              controller: currency,
              decoration: const InputDecoration(labelText: 'Currency'),
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
                    .read(promotionsRepositoryProvider)
                    .createDiscountPolicy(
                      tenantId: scope.tenantId,
                      outletId: scope.outletId,
                      code: code.text.trim(),
                      name: name.text.trim(),
                      scope: discountScope,
                      valueType: valueType,
                      percentageBps:
                          valueType == PromotionDiscountValueType.percentage
                          ? int.tryParse(value.text)
                          : null,
                      amountMinor:
                          valueType == PromotionDiscountValueType.fixedAmount
                          ? int.tryParse(value.text)
                          : null,
                      currencyCode: currency.text.trim().toUpperCase(),
                    ),
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

Future<void> _showCouponDialog(
  BuildContext context,
  WidgetRef ref,
  PromotionUiScope scope,
) async {
  final code = TextEditingController();
  final name = TextEditingController();
  final value = TextEditingController();
  final currency = TextEditingController(text: 'INR');
  final totalLimit = TextEditingController();
  var couponType = CouponType.percentage;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Create Coupon'),
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
            DropdownButtonFormField<CouponType>(
              initialValue: couponType,
              items: CouponType.values
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Text(item.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (item) =>
                  setState(() => couponType = item ?? couponType),
              decoration: const InputDecoration(labelText: 'Type'),
            ),
            TextField(
              controller: value,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: couponType == CouponType.percentage
                    ? 'Percentage bps'
                    : 'Amount minor units',
              ),
            ),
            TextField(
              controller: currency,
              decoration: const InputDecoration(labelText: 'Currency'),
            ),
            TextField(
              controller: totalLimit,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Total usage limit'),
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
              final valueType = couponType == CouponType.percentage
                  ? PromotionDiscountValueType.percentage
                  : PromotionDiscountValueType.fixedAmount;
              await _run(
                context,
                ref,
                () => ref
                    .read(promotionsRepositoryProvider)
                    .createCoupon(
                      tenantId: scope.tenantId,
                      outletId: scope.outletId,
                      code: code.text.trim(),
                      name: name.text.trim(),
                      couponType: couponType,
                      valueType: valueType,
                      percentageBps:
                          valueType == PromotionDiscountValueType.percentage
                          ? int.tryParse(value.text)
                          : null,
                      amountMinor:
                          valueType == PromotionDiscountValueType.fixedAmount
                          ? int.tryParse(value.text)
                          : null,
                      currencyCode: currency.text.trim().toUpperCase(),
                      totalUsageLimit: int.tryParse(totalLimit.text),
                    ),
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

Future<void> _showCampaignDialog(
  BuildContext context,
  WidgetRef ref,
  PromotionUiScope scope,
) async {
  final code = TextEditingController();
  final name = TextEditingController();
  final value = TextEditingController();
  final startsAt = TextEditingController(
    text: DateTime.now().toUtc().toIso8601String(),
  );
  final endsAt = TextEditingController(
    text: DateTime.now()
        .toUtc()
        .add(const Duration(days: 14))
        .toIso8601String(),
  );
  var ruleType = PromotionRuleType.percentage;
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Create Campaign'),
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
            TextField(
              controller: startsAt,
              decoration: const InputDecoration(labelText: 'Starts at UTC ISO'),
            ),
            TextField(
              controller: endsAt,
              decoration: const InputDecoration(labelText: 'Ends at UTC ISO'),
            ),
            DropdownButtonFormField<PromotionRuleType>(
              initialValue: ruleType,
              items: PromotionRuleType.values
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Text(item.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (item) => setState(() => ruleType = item ?? ruleType),
              decoration: const InputDecoration(labelText: 'Initial rule type'),
            ),
            TextField(
              controller: value,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: ruleType == PromotionRuleType.percentage
                    ? 'Percentage bps'
                    : 'Amount minor units',
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
              final valueType = ruleType == PromotionRuleType.percentage
                  ? PromotionDiscountValueType.percentage
                  : PromotionDiscountValueType.fixedAmount;
              await _run(
                context,
                ref,
                () => ref
                    .read(promotionsRepositoryProvider)
                    .createCampaign(
                      tenantId: scope.tenantId,
                      code: code.text.trim(),
                      name: name.text.trim(),
                      startsAt: DateTime.parse(startsAt.text),
                      endsAt: DateTime.parse(endsAt.text),
                      rules: <PromotionRuleInput>[
                        PromotionRuleInput(
                          ruleType: ruleType,
                          name: '${name.text.trim()} rule',
                          valueType: valueType,
                          percentageBps:
                              valueType == PromotionDiscountValueType.percentage
                              ? int.tryParse(value.text)
                              : null,
                          amountMinor:
                              valueType ==
                                  PromotionDiscountValueType.fixedAmount
                              ? int.tryParse(value.text)
                              : null,
                          currencyCode: 'INR',
                        ),
                      ],
                    ),
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

Future<void> _run<T>(
  BuildContext context,
  WidgetRef ref,
  Future<T> Function() action,
) async {
  try {
    await action();
    ref.invalidate(discountPoliciesProvider);
    ref.invalidate(couponsProvider);
    ref.invalidate(promotionCampaignsProvider);
    ref.invalidate(promotionRedemptionsProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Promotion change saved.')));
    }
  } on Object catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Promotion change failed: $error')),
      );
    }
  }
}

String _discountDescription(
  PromotionDiscountValueType type,
  int? percentageBps,
  int? amountMinor,
  String? currencyCode,
) => switch (type) {
  PromotionDiscountValueType.percentage => '${percentageBps ?? 0} bps',
  PromotionDiscountValueType.fixedAmount => _money(
    amountMinor ?? 0,
    currencyCode ?? 'INR',
  ),
};

String _money(int minor, String currencyCode) =>
    '$currencyCode ${(minor / 100).toStringAsFixed(2)}';

String _date(DateTime value) => value.toLocal().toString().split('.').first;

String _window(DateTime? startsAt, DateTime? endsAt) {
  final start = startsAt == null ? 'now' : _date(startsAt);
  final end = endsAt == null ? 'open' : _date(endsAt);
  return '$start to $end';
}

bool _isToday(DateTime value) {
  final local = value.toLocal();
  final now = DateTime.now();
  return local.year == now.year &&
      local.month == now.month &&
      local.day == now.day;
}

List<String> _splitCsv(String value) => value
    .split(',')
    .map((item) => item.trim())
    .where((item) => item.isNotEmpty)
    .toList(growable: false);

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}
