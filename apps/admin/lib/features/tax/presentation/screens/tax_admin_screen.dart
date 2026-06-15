import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/tax_query.dart';
import '../providers/tax_providers.dart';

class TaxAdminScreen extends ConsumerStatefulWidget {
  const TaxAdminScreen({super.key});

  @override
  ConsumerState<TaxAdminScreen> createState() => _TaxAdminScreenState();
}

class _TaxAdminScreenState extends ConsumerState<TaxAdminScreen> {
  late final TextEditingController _tenantController;
  late final TextEditingController _outletController;
  late final TextEditingController _profileController;
  DateTime? _fromDate;
  DateTime? _toDate;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authNotifierProvider).user;
    _tenantController = TextEditingController(text: user?.tenantId ?? '');
    _outletController = TextEditingController();
    _profileController = TextEditingController();
    final now = DateTime.now();
    _fromDate = DateTime(now.year, now.month, now.day);
    _toDate = _fromDate;
  }

  @override
  void dispose() {
    _tenantController.dispose();
    _outletController.dispose();
    _profileController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).user;
    final isSuperAdmin = user?.hasRole(UserRole.superAdmin) == true;
    final tenantId = isSuperAdmin
        ? _tenantController.text.trim()
        : user?.tenantId ?? '';
    final scope = TaxUiScope(
      tenantId: tenantId,
      outletId: _emptyToNull(_outletController.text),
      profileId: _emptyToNull(_profileController.text),
    );
    final reportQuery = TaxReportQuery(
      tenantId: tenantId,
      outletId: scope.outletId,
      fromDate: _fromDate,
      toDate: _toDate,
    );

    return DefaultTabController(
      length: 6,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Tax Admin'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: <Tab>[
              Tab(icon: Icon(Icons.receipt_long), text: 'Profiles'),
              Tab(icon: Icon(Icons.percent), text: 'Rates'),
              Tab(icon: Icon(Icons.account_tree), text: 'Groups'),
              Tab(icon: Icon(Icons.rule), text: 'Mappings'),
              Tab(icon: Icon(Icons.store), text: 'Fiscal policy'),
              Tab(icon: Icon(Icons.assessment), text: 'Reports'),
            ],
          ),
        ),
        body: Column(
          children: <Widget>[
            _ScopeBar(
              tenantController: _tenantController,
              outletController: _outletController,
              profileController: _profileController,
              tenantEditable: isSuperAdmin,
              fromDate: _fromDate,
              toDate: _toDate,
              onFromDateChanged: (value) => setState(() => _fromDate = value),
              onToDateChanged: (value) => setState(() => _toDate = value),
              onChanged: () => setState(() {}),
            ),
            Expanded(
              child: tenantId.isEmpty
                  ? const _EmptyScope()
                  : TabBarView(
                      children: <Widget>[
                        _ProfilesTab(scope: scope),
                        _RatesTab(scope: scope),
                        _GroupsTab(scope: scope),
                        _MappingsTab(scope: scope),
                        _FiscalPolicyTab(scope: scope),
                        _ReportsTab(query: reportQuery),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScopeBar extends StatelessWidget {
  const _ScopeBar({
    required this.tenantController,
    required this.outletController,
    required this.profileController,
    required this.tenantEditable,
    required this.fromDate,
    required this.toDate,
    required this.onFromDateChanged,
    required this.onToDateChanged,
    required this.onChanged,
  });

  final TextEditingController tenantController;
  final TextEditingController outletController;
  final TextEditingController profileController;
  final bool tenantEditable;
  final DateTime? fromDate;
  final DateTime? toDate;
  final ValueChanged<DateTime?> onFromDateChanged;
  final ValueChanged<DateTime?> onToDateChanged;
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
          _Field(
            width: 330,
            controller: tenantController,
            label: tenantEditable ? 'Tenant ID' : 'Current tenant',
            enabled: tenantEditable,
            onSubmitted: onChanged,
          ),
          _Field(
            width: 260,
            controller: outletController,
            label: 'Outlet ID',
            helper: 'Optional for reports/policy',
            onSubmitted: onChanged,
          ),
          _Field(
            width: 300,
            controller: profileController,
            label: 'Tax profile ID',
            helper: 'Optional filter for rates/groups/rules',
            onSubmitted: onChanged,
          ),
          OutlinedButton.icon(
            onPressed: () async {
              final value = await showDatePicker(
                context: context,
                initialDate: fromDate ?? DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (value != null) onFromDateChanged(value);
            },
            icon: const Icon(Icons.date_range),
            label: Text('From ${_dateLabel(fromDate)}'),
          ),
          OutlinedButton.icon(
            onPressed: () async {
              final value = await showDatePicker(
                context: context,
                initialDate: toDate ?? fromDate ?? DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (value != null) onToDateChanged(value);
            },
            icon: const Icon(Icons.event),
            label: Text('To ${_dateLabel(toDate)}'),
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

class _ProfilesTab extends ConsumerWidget {
  const _ProfilesTab({required this.scope});

  final TaxUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = TaxListQuery(tenantId: scope.tenantId);
    final profiles = ref.watch(taxProfilesProvider(query));
    return _AsyncList<TaxProfile>(
      value: profiles,
      title: 'Tax profiles',
      actionLabel: 'New profile',
      onAction: () async {
        final draft = await _profileDialog(context);
        if (draft == null) return;
        await ref
            .read(taxRepositoryProvider)
            .createProfile(scope.tenantId, draft);
        ref.invalidate(taxProfilesProvider(query));
      },
      columns: const <DataColumn>[
        DataColumn(label: Text('Code')),
        DataColumn(label: Text('Name')),
        DataColumn(label: Text('Mode')),
        DataColumn(label: Text('Status')),
        DataColumn(label: Text('Default')),
        DataColumn(label: Text('Actions')),
      ],
      rowBuilder: (profile) => DataRow(
        cells: <DataCell>[
          DataCell(Text(profile.code)),
          DataCell(Text(profile.name)),
          DataCell(Text(profile.taxMode.wireName)),
          DataCell(Text(profile.status.wireName)),
          DataCell(Text(profile.isDefault ? 'Yes' : 'No')),
          DataCell(
            TextButton(
              onPressed: () async {
                final next = profile.status == TaxProfileStatus.active
                    ? TaxProfileStatus.inactive
                    : TaxProfileStatus.active;
                await ref
                    .read(taxRepositoryProvider)
                    .setProfileStatus(profile, next);
                ref.invalidate(taxProfilesProvider(query));
              },
              child: Text(
                profile.status == TaxProfileStatus.active
                    ? 'Disable'
                    : 'Enable',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RatesTab extends ConsumerWidget {
  const _RatesTab({required this.scope});

  final TaxUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = TaxListQuery(
      tenantId: scope.tenantId,
      profileId: scope.profileId,
    );
    final rates = ref.watch(taxRatesProvider(query));
    return _AsyncList<TaxRate>(
      value: rates,
      title: 'Tax rates',
      actionLabel: 'New rate',
      onAction: scope.profileId == null
          ? null
          : () async {
              final draft = await _rateDialog(context);
              if (draft == null) return;
              await ref
                  .read(taxRepositoryProvider)
                  .createRate(
                    tenantId: scope.tenantId,
                    profileId: scope.profileId!,
                    code: draft.code,
                    name: draft.name,
                    component: draft.component,
                    taxType: draft.taxType,
                    rateBps: draft.rateBps,
                  );
              ref.invalidate(taxRatesProvider(query));
            },
      columns: const <DataColumn>[
        DataColumn(label: Text('Code')),
        DataColumn(label: Text('Name')),
        DataColumn(label: Text('Component')),
        DataColumn(label: Text('Rate')),
        DataColumn(label: Text('Status')),
        DataColumn(label: Text('Effective')),
        DataColumn(label: Text('Actions')),
      ],
      rowBuilder: (rate) => DataRow(
        cells: <DataCell>[
          DataCell(Text(rate.code)),
          DataCell(Text(rate.name)),
          DataCell(Text(rate.component.wireName)),
          DataCell(Text('${rate.percentage.toStringAsFixed(2)}%')),
          DataCell(Text(rate.status.wireName)),
          DataCell(Text(_dateLabel(rate.effectiveFrom))),
          DataCell(
            TextButton(
              onPressed: () async {
                final next = rate.status == TaxRateStatus.active
                    ? TaxRateStatus.inactive
                    : TaxRateStatus.active;
                await ref.read(taxRepositoryProvider).setRateStatus(rate, next);
                ref.invalidate(taxRatesProvider(query));
              },
              child: Text(
                rate.status == TaxRateStatus.active ? 'Disable' : 'Enable',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GroupsTab extends ConsumerWidget {
  const _GroupsTab({required this.scope});

  final TaxUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = TaxListQuery(
      tenantId: scope.tenantId,
      profileId: scope.profileId,
    );
    final groups = ref.watch(taxGroupsProvider(query));
    return _AsyncList<TaxGroup>(
      value: groups,
      title: 'Tax groups',
      actionLabel: 'New group',
      onAction: scope.profileId == null
          ? null
          : () async {
              final draft = await _idsDialog(
                context,
                title: 'New tax group',
                codeLabel: 'Group code',
                nameLabel: 'Group name',
                idsLabel: 'Rate IDs, comma separated',
              );
              if (draft == null) return;
              await ref
                  .read(taxRepositoryProvider)
                  .createGroup(
                    tenantId: scope.tenantId,
                    profileId: scope.profileId!,
                    code: draft.code,
                    name: draft.name,
                    rateIds: draft.ids,
                  );
              ref.invalidate(taxGroupsProvider(query));
            },
      columns: const <DataColumn>[
        DataColumn(label: Text('Code')),
        DataColumn(label: Text('Name')),
        DataColumn(label: Text('Rates')),
        DataColumn(label: Text('Total')),
        DataColumn(label: Text('Status')),
      ],
      rowBuilder: (group) => DataRow(
        cells: <DataCell>[
          DataCell(Text(group.code)),
          DataCell(Text(group.name)),
          DataCell(Text(group.rates.map((rate) => rate.code).join(', '))),
          DataCell(Text('${(group.totalRateBps / 100).toStringAsFixed(2)}%')),
          DataCell(Text(group.status.wireName)),
        ],
      ),
    );
  }
}

class _MappingsTab extends ConsumerWidget {
  const _MappingsTab({required this.scope});

  final TaxUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = TaxListQuery(
      tenantId: scope.tenantId,
      profileId: scope.profileId,
    );
    final mappings = ref.watch(taxMappingsProvider(query));
    return _AsyncList<TaxCategoryMapping>(
      value: mappings,
      title: 'Tax mappings',
      actionLabel: 'New mapping',
      onAction: () async {
        final draft = await _mappingDialog(context);
        if (draft == null) return;
        await ref
            .read(taxRepositoryProvider)
            .createMapping(
              tenantId: scope.tenantId,
              taxRuleId: draft.taxRuleId,
              target: draft.target,
              menuCategoryId: draft.menuCategoryId,
              menuItemId: draft.menuItemId,
            );
        ref.invalidate(taxMappingsProvider(query));
      },
      columns: const <DataColumn>[
        DataColumn(label: Text('Target')),
        DataColumn(label: Text('Menu target')),
        DataColumn(label: Text('Rule')),
        DataColumn(label: Text('Active')),
        DataColumn(label: Text('Effective')),
      ],
      rowBuilder: (mapping) => DataRow(
        cells: <DataCell>[
          DataCell(Text(mapping.target.wireName)),
          DataCell(
            Text(
              mapping.menuItemId ?? mapping.menuCategoryId ?? 'Tenant default',
            ),
          ),
          DataCell(Text(mapping.taxRule.name)),
          DataCell(Text(mapping.isActive ? 'Yes' : 'No')),
          DataCell(Text(_dateLabel(mapping.effectiveFrom))),
        ],
      ),
    );
  }
}

class _FiscalPolicyTab extends ConsumerWidget {
  const _FiscalPolicyTab({required this.scope});

  final TaxUiScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = TaxListQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
    );
    final policies = ref.watch(fiscalPoliciesProvider(query));
    final sequences = ref.watch(fiscalSequencesProvider(query));
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        _AsyncList<OutletFiscalPolicy>(
          value: policies,
          title: 'Outlet fiscal policies',
          shrinkWrap: true,
          actionLabel: 'New policy',
          onAction: scope.outletId == null
              ? null
              : () async {
                  final draft = await _fiscalPolicyDialog(context);
                  if (draft == null) return;
                  await ref
                      .read(taxRepositoryProvider)
                      .createFiscalPolicy(
                        tenantId: scope.tenantId,
                        outletId: scope.outletId!,
                        taxProfileId: draft.taxProfileId,
                        invoicePrefix: draft.invoicePrefix,
                      );
                  ref.invalidate(fiscalPoliciesProvider(query));
                },
          columns: const <DataColumn>[
            DataColumn(label: Text('Outlet')),
            DataColumn(label: Text('Prefix')),
            DataColumn(label: Text('Fiscal year')),
            DataColumn(label: Text('Timezone')),
            DataColumn(label: Text('Status')),
          ],
          rowBuilder: (policy) => DataRow(
            cells: <DataCell>[
              DataCell(Text(policy.outletId)),
              DataCell(Text(policy.invoicePrefix)),
              DataCell(
                Text(
                  '${policy.fiscalYearStartMonth}/${policy.fiscalYearStartDay}',
                ),
              ),
              DataCell(Text(policy.timezone)),
              DataCell(Text(policy.status.wireName)),
            ],
          ),
        ),
        const SizedBox(height: 24),
        _AsyncList<FiscalInvoiceSequence>(
          value: sequences,
          title: 'Fiscal invoice sequences',
          shrinkWrap: true,
          columns: const <DataColumn>[
            DataColumn(label: Text('Outlet')),
            DataColumn(label: Text('Prefix')),
            DataColumn(label: Text('Fiscal year')),
            DataColumn(label: Text('Last number')),
            DataColumn(label: Text('Status')),
          ],
          rowBuilder: (sequence) => DataRow(
            cells: <DataCell>[
              DataCell(Text(sequence.outletId)),
              DataCell(Text(sequence.prefix)),
              DataCell(Text(sequence.fiscalYearLabel)),
              DataCell(Text(sequence.lastNumber.toString())),
              DataCell(Text(sequence.status.wireName)),
            ],
          ),
        ),
      ],
    );
  }
}

class _ReportsTab extends ConsumerWidget {
  const _ReportsTab({required this.query});

  final TaxReportQuery query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(taxReportSummaryProvider(query));
    final details = ref.watch(taxReportDetailsProvider(query));
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        summary.when(
          data: (value) => Wrap(
            spacing: 12,
            runSpacing: 12,
            children: <Widget>[
              _MetricCard(
                title: 'Invoices',
                value: value.invoiceCount.toString(),
              ),
              _MetricCard(
                title: 'Tax invoices',
                value: value.taxInvoiceCount.toString(),
              ),
              _MetricCard(title: 'Taxable', value: _money(value.taxableAmount)),
              _MetricCard(
                title: 'Tax collected',
                value: _money(value.taxCollectedAmount),
              ),
              ...value.components.map(
                (component) => _MetricCard(
                  title: '${component.taxName} ${component.taxRate}%',
                  value: _money(component.taxAmount),
                ),
              ),
            ],
          ),
          error: (error, _) => _ErrorBox(error: error),
          loading: () => const Center(child: CircularProgressIndicator()),
        ),
        const SizedBox(height: 24),
        details.when(
          data: (value) => _DataTableCard(
            title: 'Invoice tax detail',
            columns: const <DataColumn>[
              DataColumn(label: Text('Bill')),
              DataColumn(label: Text('Invoice')),
              DataColumn(label: Text('Date')),
              DataColumn(label: Text('Outlet')),
              DataColumn(label: Text('Taxable')),
              DataColumn(label: Text('Tax')),
            ],
            rows: value.data
                .map(
                  (row) => DataRow(
                    cells: <DataCell>[
                      DataCell(Text(row.billNumber)),
                      DataCell(Text(row.invoiceNumber ?? '-')),
                      DataCell(Text(_dateLabel(row.businessDate))),
                      DataCell(Text(row.outletCode)),
                      DataCell(Text(_money(row.taxableAmount))),
                      DataCell(Text(_money(row.taxAmount))),
                    ],
                  ),
                )
                .toList(growable: false),
          ),
          error: (error, _) => _ErrorBox(error: error),
          loading: () => const Center(child: CircularProgressIndicator()),
        ),
      ],
    );
  }
}

class _AsyncList<T> extends StatelessWidget {
  const _AsyncList({
    required this.value,
    required this.title,
    required this.columns,
    required this.rowBuilder,
    this.actionLabel,
    this.onAction,
    this.shrinkWrap = false,
  });

  final AsyncValue<PaginatedResponse<T>> value;
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final List<DataColumn> columns;
  final DataRow Function(T item) rowBuilder;
  final bool shrinkWrap;

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: (page) => _DataTableCard(
        title: '$title (${page.meta.total})',
        actionLabel: actionLabel,
        onAction: onAction,
        columns: columns,
        rows: page.data.map(rowBuilder).toList(growable: false),
        shrinkWrap: shrinkWrap,
      ),
      error: (error, _) => _ErrorBox(error: error),
      loading: () => const Center(child: CircularProgressIndicator()),
    );
  }
}

class _DataTableCard extends StatelessWidget {
  const _DataTableCard({
    required this.title,
    required this.columns,
    required this.rows,
    this.actionLabel,
    this.onAction,
    this.shrinkWrap = false,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final List<DataColumn> columns;
  final List<DataRow> rows;
  final bool shrinkWrap;

  @override
  Widget build(BuildContext context) {
    final table = Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                if (actionLabel != null)
                  FilledButton.icon(
                    onPressed: onAction,
                    icon: const Icon(Icons.add),
                    label: Text(actionLabel!),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: columns,
                rows: rows.isEmpty
                    ? <DataRow>[
                        DataRow(
                          cells: List<DataCell>.generate(
                            columns.length,
                            (index) =>
                                DataCell(Text(index == 0 ? 'No records' : '')),
                          ),
                        ),
                      ]
                    : rows,
              ),
            ),
          ],
        ),
      ),
    );
    if (shrinkWrap) return table;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[table],
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
      width: 180,
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

class _Field extends StatelessWidget {
  const _Field({
    required this.width,
    required this.controller,
    required this.label,
    this.helper,
    this.enabled = true,
    this.onSubmitted,
  });

  final double width;
  final TextEditingController controller;
  final String label;
  final String? helper;
  final bool enabled;
  final VoidCallback? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: TextField(
        controller: controller,
        enabled: enabled,
        decoration: InputDecoration(
          labelText: label,
          helperText: helper,
          border: const OutlineInputBorder(),
        ),
        onSubmitted: (_) => onSubmitted?.call(),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.error});
  final Object error;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(16),
    child: Card(
      color: Theme.of(context).colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(error.toString()),
      ),
    ),
  );
}

class _EmptyScope extends StatelessWidget {
  const _EmptyScope();

  @override
  Widget build(BuildContext context) => const Center(
    child: Text('Enter a tenant ID to load tax administration data.'),
  );
}

class _RateDraft {
  const _RateDraft({
    required this.code,
    required this.name,
    required this.component,
    required this.taxType,
    required this.rateBps,
  });
  final String code;
  final String name;
  final TaxComponent component;
  final TaxType taxType;
  final int rateBps;
}

class _IdsDraft {
  const _IdsDraft({required this.code, required this.name, required this.ids});
  final String code;
  final String name;
  final List<String> ids;
}

class _MappingDraft {
  const _MappingDraft({
    required this.taxRuleId,
    required this.target,
    this.menuCategoryId,
    this.menuItemId,
  });
  final String taxRuleId;
  final TaxMappingTarget target;
  final String? menuCategoryId;
  final String? menuItemId;
}

class _FiscalPolicyDraft {
  const _FiscalPolicyDraft({required this.invoicePrefix, this.taxProfileId});
  final String invoicePrefix;
  final String? taxProfileId;
}

Future<TaxProfileDraft?> _profileDialog(BuildContext context) async {
  final code = TextEditingController();
  final name = TextEditingController();
  var type = TaxType.gst;
  var mode = TaxMode.exclusive;
  var isDefault = false;
  return showDialog<TaxProfileDraft>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('New tax profile'),
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
            DropdownButton<TaxType>(
              value: type,
              items: TaxType.values
                  .map(
                    (value) => DropdownMenuItem(
                      value: value,
                      child: Text(value.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => type = value ?? type),
            ),
            DropdownButton<TaxMode>(
              value: mode,
              items: TaxMode.values
                  .map(
                    (value) => DropdownMenuItem(
                      value: value,
                      child: Text(value.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => mode = value ?? mode),
            ),
            CheckboxListTile(
              value: isDefault,
              onChanged: (value) => setState(() => isDefault = value ?? false),
              title: const Text('Default profile'),
            ),
          ],
        ),
        actions: _dialogActions(
          context,
          () => TaxProfileDraft(
            code: code.text.trim(),
            name: name.text.trim(),
            taxType: type,
            taxMode: mode,
            isDefault: isDefault,
          ),
        ),
      ),
    ),
  );
}

Future<_RateDraft?> _rateDialog(BuildContext context) async {
  final code = TextEditingController();
  final name = TextEditingController();
  final rate = TextEditingController(text: '1800');
  var component = TaxComponent.gst;
  var type = TaxType.gst;
  return showDialog<_RateDraft>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('New tax rate'),
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
              controller: rate,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Rate bps'),
            ),
            DropdownButton<TaxComponent>(
              value: component,
              items: TaxComponent.values
                  .map(
                    (value) => DropdownMenuItem(
                      value: value,
                      child: Text(value.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (value) =>
                  setState(() => component = value ?? component),
            ),
            DropdownButton<TaxType>(
              value: type,
              items: TaxType.values
                  .map(
                    (value) => DropdownMenuItem(
                      value: value,
                      child: Text(value.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => type = value ?? type),
            ),
          ],
        ),
        actions: _dialogActions(
          context,
          () => _RateDraft(
            code: code.text.trim(),
            name: name.text.trim(),
            component: component,
            taxType: type,
            rateBps: int.tryParse(rate.text.trim()) ?? 0,
          ),
        ),
      ),
    ),
  );
}

Future<_IdsDraft?> _idsDialog(
  BuildContext context, {
  required String title,
  required String codeLabel,
  required String nameLabel,
  required String idsLabel,
}) async {
  final code = TextEditingController();
  final name = TextEditingController();
  final ids = TextEditingController();
  return showDialog<_IdsDraft>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: _DialogFields(
        children: <Widget>[
          TextField(
            controller: code,
            decoration: InputDecoration(labelText: codeLabel),
          ),
          TextField(
            controller: name,
            decoration: InputDecoration(labelText: nameLabel),
          ),
          TextField(
            controller: ids,
            decoration: InputDecoration(labelText: idsLabel),
          ),
        ],
      ),
      actions: _dialogActions(
        context,
        () => _IdsDraft(
          code: code.text.trim(),
          name: name.text.trim(),
          ids: ids.text
              .split(',')
              .map((value) => value.trim())
              .where((value) => value.isNotEmpty)
              .toList(growable: false),
        ),
      ),
    ),
  );
}

Future<_MappingDraft?> _mappingDialog(BuildContext context) async {
  final taxRuleId = TextEditingController();
  final menuTargetId = TextEditingController();
  var target = TaxMappingTarget.tenantDefault;
  return showDialog<_MappingDraft>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('New tax mapping'),
        content: _DialogFields(
          children: <Widget>[
            TextField(
              controller: taxRuleId,
              decoration: const InputDecoration(labelText: 'Tax rule ID'),
            ),
            DropdownButton<TaxMappingTarget>(
              value: target,
              items: TaxMappingTarget.values
                  .map(
                    (value) => DropdownMenuItem(
                      value: value,
                      child: Text(value.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => target = value ?? target),
            ),
            TextField(
              controller: menuTargetId,
              enabled: target != TaxMappingTarget.tenantDefault,
              decoration: const InputDecoration(
                labelText: 'Menu category/item ID',
              ),
            ),
          ],
        ),
        actions: _dialogActions(
          context,
          () => _MappingDraft(
            taxRuleId: taxRuleId.text.trim(),
            target: target,
            menuCategoryId: target == TaxMappingTarget.category
                ? menuTargetId.text.trim()
                : null,
            menuItemId: target == TaxMappingTarget.item
                ? menuTargetId.text.trim()
                : null,
          ),
        ),
      ),
    ),
  );
}

Future<_FiscalPolicyDraft?> _fiscalPolicyDialog(BuildContext context) async {
  final prefix = TextEditingController();
  final profileId = TextEditingController();
  return showDialog<_FiscalPolicyDraft>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('New outlet fiscal policy'),
      content: _DialogFields(
        children: <Widget>[
          TextField(
            controller: prefix,
            decoration: const InputDecoration(labelText: 'Invoice prefix'),
          ),
          TextField(
            controller: profileId,
            decoration: const InputDecoration(
              labelText: 'Tax profile ID (optional)',
            ),
          ),
        ],
      ),
      actions: _dialogActions(
        context,
        () => _FiscalPolicyDraft(
          invoicePrefix: prefix.text.trim(),
          taxProfileId: _emptyToNull(profileId.text),
        ),
      ),
    ),
  );
}

class _DialogFields extends StatelessWidget {
  const _DialogFields({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 420,
    child: SingleChildScrollView(
      child: Column(mainAxisSize: MainAxisSize.min, children: children),
    ),
  );
}

List<Widget> _dialogActions<T>(BuildContext context, T Function() value) =>
    <Widget>[
      TextButton(
        onPressed: () => Navigator.of(context).pop(),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(value()),
        child: const Text('Save'),
      ),
    ];

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

String _dateLabel(DateTime? value) {
  if (value == null) return '-';
  return value.toIso8601String().substring(0, 10);
}

String _money(int minor) => (minor / 100).toStringAsFixed(2);
