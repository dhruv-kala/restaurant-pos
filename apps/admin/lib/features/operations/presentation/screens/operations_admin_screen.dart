import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/operations_query.dart';
import '../providers/operations_providers.dart';

class OperationsAdminScreen extends ConsumerStatefulWidget {
  const OperationsAdminScreen({super.key});

  @override
  ConsumerState<OperationsAdminScreen> createState() =>
      _OperationsAdminScreenState();
}

class _OperationsAdminScreenState extends ConsumerState<OperationsAdminScreen> {
  late final TextEditingController _tenantController;
  late final TextEditingController _outletController;
  late final TextEditingController _businessDayController;
  late final TextEditingController _shiftSessionController;
  late final TextEditingController _cashDrawerController;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authNotifierProvider).user;
    _tenantController = TextEditingController(text: user?.tenantId ?? '');
    _outletController = TextEditingController();
    _businessDayController = TextEditingController();
    _shiftSessionController = TextEditingController();
    _cashDrawerController = TextEditingController();
  }

  @override
  void dispose() {
    _tenantController.dispose();
    _outletController.dispose();
    _businessDayController.dispose();
    _shiftSessionController.dispose();
    _cashDrawerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).user;
    final isSuperAdmin = user?.hasRole(UserRole.superAdmin) == true;
    final tenantId = isSuperAdmin
        ? _tenantController.text.trim()
        : user?.tenantId ?? '';
    final scope = OperationsScope(
      tenantId: tenantId,
      outletId: _emptyToNull(_outletController.text),
      businessDayId: _emptyToNull(_businessDayController.text),
      shiftSessionId: _emptyToNull(_shiftSessionController.text),
      cashDrawerId: _emptyToNull(_cashDrawerController.text),
    );
    return DefaultTabController(
      length: 6,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Operations'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: <Tab>[
              Tab(icon: Icon(Icons.today_outlined), text: 'Business day'),
              Tab(icon: Icon(Icons.schedule_outlined), text: 'Shifts'),
              Tab(icon: Icon(Icons.point_of_sale_outlined), text: 'Drawers'),
              Tab(icon: Icon(Icons.fact_check_outlined), text: 'Reconcile'),
              Tab(icon: Icon(Icons.lock_clock_outlined), text: 'Day closing'),
              Tab(icon: Icon(Icons.history_outlined), text: 'Audit'),
            ],
          ),
        ),
        body: Column(
          children: <Widget>[
            _ScopeBar(
              tenantController: _tenantController,
              outletController: _outletController,
              businessDayController: _businessDayController,
              shiftSessionController: _shiftSessionController,
              cashDrawerController: _cashDrawerController,
              tenantEditable: isSuperAdmin,
              onChanged: () => setState(() {}),
            ),
            Expanded(
              child: tenantId.isEmpty
                  ? const _EmptyScope()
                  : TabBarView(
                      children: <Widget>[
                        _BusinessDayTab(scope: scope),
                        _ShiftTab(scope: scope),
                        _CashDrawerTab(scope: scope),
                        _ReconciliationTab(scope: scope),
                        _DayClosingTab(scope: scope),
                        _AuditTab(scope: scope),
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
    required this.businessDayController,
    required this.shiftSessionController,
    required this.cashDrawerController,
    required this.tenantEditable,
    required this.onChanged,
  });

  final TextEditingController tenantController;
  final TextEditingController outletController;
  final TextEditingController businessDayController;
  final TextEditingController shiftSessionController;
  final TextEditingController cashDrawerController;
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
          _ScopeField(
            controller: tenantController,
            label: tenantEditable ? 'Tenant ID' : 'Current tenant',
            enabled: tenantEditable,
            width: 300,
            onSubmitted: onChanged,
          ),
          _ScopeField(
            controller: outletController,
            label: 'Outlet ID',
            width: 260,
            onSubmitted: onChanged,
          ),
          _ScopeField(
            controller: businessDayController,
            label: 'Business day ID',
            width: 260,
            onSubmitted: onChanged,
          ),
          _ScopeField(
            controller: shiftSessionController,
            label: 'Shift session ID',
            width: 260,
            onSubmitted: onChanged,
          ),
          _ScopeField(
            controller: cashDrawerController,
            label: 'Cash drawer ID',
            width: 260,
            onSubmitted: onChanged,
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

class _ScopeField extends StatelessWidget {
  const _ScopeField({
    required this.controller,
    required this.label,
    required this.width,
    required this.onSubmitted,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String label;
  final double width;
  final VoidCallback onSubmitted;
  final bool enabled;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    child: TextField(
      controller: controller,
      enabled: enabled,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      onSubmitted: (_) => onSubmitted(),
    ),
  );
}

class _BusinessDayTab extends ConsumerWidget {
  const _BusinessDayTab({required this.scope});

  final OperationsScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = BusinessDayQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
    );
    final days = ref.watch(businessDaysProvider(query));
    return _AsyncList<BusinessDay>(
      title: 'Business days',
      action: FilledButton.icon(
        onPressed: scope.outletId == null
            ? null
            : () => _openBusinessDay(context, ref, scope),
        icon: const Icon(Icons.add),
        label: const Text('Open business day'),
      ),
      value: days,
      itemBuilder: (context, day) => ListTile(
        leading: Icon(
          day.status == BusinessDayStatus.open
              ? Icons.lock_open
              : Icons.lock_outline,
        ),
        title: Text('${_date(day.businessDate)} · ${day.status.wireName}'),
        subtitle: Text('Outlet ${day.outletId}\nID ${day.id}'),
        trailing: day.status == BusinessDayStatus.open
            ? TextButton(
                onPressed: () => _closeBusinessDay(context, ref, day),
                child: const Text('Close'),
              )
            : null,
        isThreeLine: true,
      ),
    );
  }
}

class _ShiftTab extends ConsumerWidget {
  const _ShiftTab({required this.scope});

  final OperationsScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ShiftSessionQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      businessDayId: scope.businessDayId,
    );
    final shifts = ref.watch(shiftSessionsProvider(query));
    return _AsyncList<ShiftSession>(
      title: 'Shift sessions',
      action: FilledButton.icon(
        onPressed: scope.outletId == null
            ? null
            : () => _openShift(context, ref, scope),
        icon: const Icon(Icons.add),
        label: const Text('Open shift'),
      ),
      value: shifts,
      itemBuilder: (context, shift) => ListTile(
        leading: Icon(
          shift.status == ShiftSessionStatus.open
              ? Icons.person_pin_circle_outlined
              : Icons.person_off_outlined,
        ),
        title: Text('${shift.status.wireName} · user ${shift.assignedUserId}'),
        subtitle: Text(
          'Business day ${shift.businessDayId}\nShift ${shift.id}',
        ),
        trailing: shift.status == ShiftSessionStatus.open
            ? TextButton(
                onPressed: () => _closeShift(context, ref, shift),
                child: const Text('Close'),
              )
            : null,
        isThreeLine: true,
      ),
    );
  }
}

class _CashDrawerTab extends ConsumerWidget {
  const _CashDrawerTab({required this.scope});

  final OperationsScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = CashDrawerQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      businessDayId: scope.businessDayId,
      shiftSessionId: scope.shiftSessionId,
    );
    final drawers = ref.watch(cashDrawersProvider(query));
    return _AsyncList<CashDrawer>(
      title: 'Cash drawers',
      action: FilledButton.icon(
        onPressed: scope.shiftSessionId == null
            ? null
            : () => _openDrawer(context, ref, scope),
        icon: const Icon(Icons.add),
        label: const Text('Open drawer'),
      ),
      value: drawers,
      itemBuilder: (context, drawer) => ListTile(
        leading: Icon(
          drawer.status == CashDrawerStatus.open
              ? Icons.point_of_sale
              : Icons.payments_outlined,
        ),
        title: Text(
          '${drawer.status.wireName} · ${_money(drawer.expectedCashMinor, drawer.currencyCode)} expected',
        ),
        subtitle: Text('Shift ${drawer.shiftSessionId}\nDrawer ${drawer.id}'),
        trailing: Wrap(
          spacing: 8,
          children: <Widget>[
            TextButton(
              onPressed: () => _viewDrawerTransactions(context, ref, drawer),
              child: const Text('Transactions'),
            ),
            if (drawer.status == CashDrawerStatus.open)
              TextButton(
                onPressed: () => _adjustDrawer(context, ref, drawer),
                child: const Text('Adjust'),
              ),
            if (drawer.status == CashDrawerStatus.open)
              TextButton(
                onPressed: () => _closeDrawer(context, ref, drawer),
                child: const Text('Close'),
              ),
          ],
        ),
        isThreeLine: true,
      ),
    );
  }
}

class _ReconciliationTab extends ConsumerWidget {
  const _ReconciliationTab({required this.scope});

  final OperationsScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ShiftReconciliationQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      businessDayId: scope.businessDayId,
      shiftSessionId: scope.shiftSessionId,
      cashDrawerId: scope.cashDrawerId,
    );
    final reconciliations = ref.watch(shiftReconciliationsProvider(query));
    return _AsyncList<ShiftReconciliation>(
      title: 'Shift reconciliations',
      action: FilledButton.icon(
        onPressed: scope.shiftSessionId == null || scope.cashDrawerId == null
            ? null
            : () => _createReconciliation(context, ref, scope),
        icon: const Icon(Icons.add_task),
        label: const Text('Create reconciliation'),
      ),
      value: reconciliations,
      itemBuilder: (context, reconciliation) => ListTile(
        leading: const Icon(Icons.fact_check_outlined),
        title: Text(
          'Variance ${_money(reconciliation.varianceMinor, reconciliation.currencyCode)}',
        ),
        subtitle: Text(
          'Expected ${_money(reconciliation.expectedCashMinor, reconciliation.currencyCode)} · Counted ${_money(reconciliation.countedCashMinor, reconciliation.currencyCode)}\n${reconciliation.id}',
        ),
        isThreeLine: true,
      ),
    );
  }
}

class _DayClosingTab extends ConsumerWidget {
  const _DayClosingTab({required this.scope});

  final OperationsScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = BusinessDayQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      status: BusinessDayStatus.closed,
    );
    final days = ref.watch(businessDaysProvider(query));
    return _AsyncList<BusinessDay>(
      title: 'Closed business days',
      value: days,
      itemBuilder: (context, day) => ListTile(
        leading: const Icon(Icons.lock_clock_outlined),
        title: Text(_date(day.businessDate)),
        subtitle: Text('Closed ${_dateTime(day.closedAt)}\n${day.id}'),
        trailing: TextButton(
          onPressed: () => _viewClosing(context, ref, day),
          child: const Text('Closing'),
        ),
        isThreeLine: true,
      ),
    );
  }
}

class _AuditTab extends ConsumerStatefulWidget {
  const _AuditTab({required this.scope});

  final OperationsScope scope;

  @override
  ConsumerState<_AuditTab> createState() => _AuditTabState();
}

class _AuditTabState extends ConsumerState<_AuditTab> {
  String? _targetType;

  @override
  Widget build(BuildContext context) {
    final query = OperationAuditQuery(
      tenantId: widget.scope.tenantId,
      outletId: widget.scope.outletId,
      targetType: _targetType,
      limit: 50,
    );
    final events = ref.watch(operationAuditEventsProvider(query));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              DropdownMenu<String?>(
                initialSelection: _targetType,
                label: const Text('Audit target'),
                dropdownMenuEntries: const <DropdownMenuEntry<String?>>[
                  DropdownMenuEntry(value: null, label: 'All operations'),
                  DropdownMenuEntry(
                    value: 'BusinessDay',
                    label: 'Business day',
                  ),
                  DropdownMenuEntry(value: 'ShiftSession', label: 'Shift'),
                  DropdownMenuEntry(value: 'CashDrawer', label: 'Cash drawer'),
                  DropdownMenuEntry(
                    value: 'ShiftReconciliation',
                    label: 'Reconciliation',
                  ),
                  DropdownMenuEntry(
                    value: 'BusinessDayClosing',
                    label: 'Day closing',
                  ),
                ],
                onSelected: (value) => setState(() => _targetType = value),
              ),
              OutlinedButton.icon(
                onPressed: () =>
                    ref.invalidate(operationAuditEventsProvider(query)),
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh audit'),
              ),
            ],
          ),
        ),
        Expanded(
          child: _AsyncList<AuditEvent>(
            title: 'Audit history',
            value: events,
            itemBuilder: (context, event) => ListTile(
              leading: const Icon(Icons.history),
              title: Text('${event.action} · ${event.result.wireName}'),
              subtitle: Text(
                '${event.targetType} ${event.targetId ?? ''}\n${_dateTime(event.occurredAt)}',
              ),
              isThreeLine: true,
            ),
          ),
        ),
      ],
    );
  }
}

class _AsyncList<T> extends StatelessWidget {
  const _AsyncList({
    required this.title,
    required this.value,
    required this.itemBuilder,
    this.action,
  });

  final String title;
  final AsyncValue<PaginatedResponse<T>> value;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final Widget? action;

  @override
  Widget build(BuildContext context) => value.when(
    data: (response) => ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                '$title (${response.meta.total})',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            if (action != null) action!,
          ],
        ),
        const SizedBox(height: 12),
        if (response.data.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text('No records found for this scope.'),
            ),
          )
        else
          ...response.data.map(
            (item) => Card(child: itemBuilder(context, item)),
          ),
      ],
    ),
    error: (error, _) => _ErrorState(message: error.toString()),
    loading: () => const Center(child: CircularProgressIndicator()),
  );
}

class _EmptyScope extends StatelessWidget {
  const _EmptyScope();

  @override
  Widget build(BuildContext context) => const Center(
    child: Text('Tenant scope is required before loading operations.'),
  );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(message, textAlign: TextAlign.center),
    ),
  );
}

Future<void> _openBusinessDay(
  BuildContext context,
  WidgetRef ref,
  OperationsScope scope,
) async {
  final date = TextEditingController(text: _date(DateTime.now()));
  final notes = TextEditingController();
  final confirmed = await _formDialog(
    context,
    title: 'Open business day',
    fields: <Widget>[
      _DialogField(controller: date, label: 'Business date (YYYY-MM-DD)'),
      _DialogField(controller: notes, label: 'Opening notes', maxLines: 3),
    ],
  );
  if (confirmed != true || scope.outletId == null) return;
  await _runCommand(context, () async {
    await ref
        .read(operationsRepositoryProvider)
        .openBusinessDay(
          tenantId: scope.tenantId,
          outletId: scope.outletId!,
          businessDate: DateTime.parse(date.text.trim()),
          openingNotes: _emptyToNull(notes.text),
        );
    ref.invalidate(businessDaysProvider);
  });
}

Future<void> _closeBusinessDay(
  BuildContext context,
  WidgetRef ref,
  BusinessDay day,
) async {
  final notes = TextEditingController();
  final confirmed = await _formDialog(
    context,
    title: 'Close business day',
    fields: <Widget>[
      Text(
        'Version ${day.version}. All shifts and drawers must already be closed and reconciled.',
      ),
      _DialogField(controller: notes, label: 'Closing notes', maxLines: 3),
    ],
  );
  if (confirmed != true) return;
  await _runCommand(context, () async {
    await ref
        .read(operationsRepositoryProvider)
        .closeBusinessDay(day, closingNotes: _emptyToNull(notes.text));
    ref.invalidate(businessDaysProvider);
  });
}

Future<void> _openShift(
  BuildContext context,
  WidgetRef ref,
  OperationsScope scope,
) async {
  final assignedUserId = TextEditingController();
  final shiftId = TextEditingController();
  final notes = TextEditingController();
  final confirmed = await _formDialog(
    context,
    title: 'Open shift',
    fields: <Widget>[
      _DialogField(
        controller: assignedUserId,
        label: 'Assigned user ID',
        helper: 'Optional. Defaults to the signed-in operator.',
      ),
      _DialogField(
        controller: shiftId,
        label: 'Shift template ID',
        helper: 'Optional',
      ),
      _DialogField(controller: notes, label: 'Opening notes', maxLines: 3),
    ],
  );
  if (confirmed != true || scope.outletId == null) return;
  await _runCommand(context, () async {
    await ref
        .read(operationsRepositoryProvider)
        .openShiftSession(
          tenantId: scope.tenantId,
          outletId: scope.outletId!,
          assignedUserId: _emptyToNull(assignedUserId.text),
          shiftId: _emptyToNull(shiftId.text),
          openingNotes: _emptyToNull(notes.text),
        );
    ref.invalidate(shiftSessionsProvider);
  });
}

Future<void> _closeShift(
  BuildContext context,
  WidgetRef ref,
  ShiftSession shift,
) async {
  final notes = TextEditingController();
  final confirmed = await _formDialog(
    context,
    title: 'Close shift',
    fields: <Widget>[
      Text(
        'Version ${shift.version}. A reconciliation must exist before closing.',
      ),
      _DialogField(controller: notes, label: 'Closing notes', maxLines: 3),
    ],
  );
  if (confirmed != true) return;
  await _runCommand(context, () async {
    await ref
        .read(operationsRepositoryProvider)
        .closeShiftSession(shift, closingNotes: _emptyToNull(notes.text));
    ref.invalidate(shiftSessionsProvider);
  });
}

Future<void> _openDrawer(
  BuildContext context,
  WidgetRef ref,
  OperationsScope scope,
) async {
  final openingBalance = TextEditingController(text: '0');
  final currency = TextEditingController(text: 'INR');
  final notes = TextEditingController();
  final confirmed = await _formDialog(
    context,
    title: 'Open cash drawer',
    fields: <Widget>[
      _DialogField(controller: openingBalance, label: 'Opening balance minor'),
      _DialogField(controller: currency, label: 'Currency code'),
      _DialogField(controller: notes, label: 'Opening notes', maxLines: 3),
    ],
  );
  if (confirmed != true || scope.shiftSessionId == null) return;
  await _runCommand(context, () async {
    await ref
        .read(operationsRepositoryProvider)
        .openCashDrawer(
          tenantId: scope.tenantId,
          shiftSessionId: scope.shiftSessionId!,
          openingBalanceMinor: int.parse(openingBalance.text.trim()),
          currencyCode: currency.text.trim().toUpperCase(),
          openingNotes: _emptyToNull(notes.text),
        );
    ref.invalidate(cashDrawersProvider);
  });
}

Future<void> _adjustDrawer(
  BuildContext context,
  WidgetRef ref,
  CashDrawer drawer,
) async {
  final amount = TextEditingController(text: '0');
  final note = TextEditingController();
  var type = CashDrawerTransactionType.cashIn;
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Adjust drawer'),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              DropdownButtonFormField<CashDrawerTransactionType>(
                value: type,
                decoration: const InputDecoration(
                  labelText: 'Transaction type',
                ),
                items: CashDrawerTransactionType.values
                    .where(
                      (value) =>
                          value != CashDrawerTransactionType.openingBalance &&
                          value != CashDrawerTransactionType.closingBalance,
                    )
                    .map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(value.wireName),
                      ),
                    )
                    .toList(growable: false),
                onChanged: (value) {
                  if (value != null) setState(() => type = value);
                },
              ),
              const SizedBox(height: 12),
              _DialogField(controller: amount, label: 'Amount minor'),
              _DialogField(controller: note, label: 'Note', maxLines: 3),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Record'),
          ),
        ],
      ),
    ),
  );
  if (confirmed != true) return;
  await _runCommand(context, () async {
    await ref
        .read(operationsRepositoryProvider)
        .addCashDrawerTransaction(
          tenantId: drawer.tenantId,
          drawerId: drawer.id,
          transactionType: type,
          amountMinor: int.parse(amount.text.trim()),
          note: _emptyToNull(note.text),
        );
    ref.invalidate(cashDrawersProvider);
  });
}

Future<void> _closeDrawer(
  BuildContext context,
  WidgetRef ref,
  CashDrawer drawer,
) async {
  final closingBalance = TextEditingController(
    text: drawer.expectedCashMinor.toString(),
  );
  final notes = TextEditingController();
  final confirmed = await _formDialog(
    context,
    title: 'Close cash drawer',
    fields: <Widget>[
      Text('Version ${drawer.version}.'),
      _DialogField(controller: closingBalance, label: 'Closing balance minor'),
      _DialogField(controller: notes, label: 'Closing notes', maxLines: 3),
    ],
  );
  if (confirmed != true) return;
  await _runCommand(context, () async {
    await ref
        .read(operationsRepositoryProvider)
        .closeCashDrawer(
          drawer,
          closingBalanceMinor: int.parse(closingBalance.text.trim()),
          closingNotes: _emptyToNull(notes.text),
        );
    ref.invalidate(cashDrawersProvider);
  });
}

Future<void> _createReconciliation(
  BuildContext context,
  WidgetRef ref,
  OperationsScope scope,
) async {
  final countedCash = TextEditingController(text: '0');
  final notes = TextEditingController();
  final confirmed = await _formDialog(
    context,
    title: 'Create reconciliation',
    fields: <Widget>[
      _DialogField(controller: countedCash, label: 'Counted cash minor'),
      _DialogField(controller: notes, label: 'Approval notes', maxLines: 3),
    ],
  );
  if (confirmed != true ||
      scope.shiftSessionId == null ||
      scope.cashDrawerId == null) {
    return;
  }
  await _runCommand(context, () async {
    await ref
        .read(operationsRepositoryProvider)
        .createShiftReconciliation(
          tenantId: scope.tenantId,
          shiftSessionId: scope.shiftSessionId!,
          cashDrawerId: scope.cashDrawerId!,
          countedCashMinor: int.parse(countedCash.text.trim()),
          approvalNotes: _emptyToNull(notes.text),
        );
    ref.invalidate(shiftReconciliationsProvider);
  });
}

Future<void> _viewClosing(
  BuildContext context,
  WidgetRef ref,
  BusinessDay day,
) async {
  await _runCommand(context, () async {
    final closing = await ref
        .read(operationsRepositoryProvider)
        .businessDayClosing(day);
    if (!context.mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Closing ${_date(closing.businessDate)}'),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _Detail('Shifts', closing.shiftSessionCount.toString()),
              _Detail('Drawers', closing.cashDrawerCount.toString()),
              _Detail(
                'Reconciliations',
                closing.reconciliationCount.toString(),
              ),
              _Detail(
                'Expected cash',
                _money(closing.expectedCashMinor, closing.currencyCode),
              ),
              _Detail(
                'Counted cash',
                _money(closing.countedCashMinor, closing.currencyCode),
              ),
              _Detail(
                'Variance',
                _money(closing.varianceMinor, closing.currencyCode),
              ),
              _Detail('Closed at', _dateTime(closing.closedAt)),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }, showSuccess: false);
}

Future<void> _viewDrawerTransactions(
  BuildContext context,
  WidgetRef ref,
  CashDrawer drawer,
) async {
  await _runCommand(context, () async {
    final transactions = await ref
        .read(operationsRepositoryProvider)
        .cashDrawerTransactions(drawer);
    if (!context.mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Drawer transactions'),
        content: SizedBox(
          width: 520,
          child: transactions.isEmpty
              ? const Text('No drawer transactions found.')
              : ListView(
                  shrinkWrap: true,
                  children: transactions
                      .map(
                        (transaction) => ListTile(
                          title: Text(transaction.transactionType.wireName),
                          subtitle: Text(
                            '${_money(transaction.amountMinor, drawer.currencyCode)} · balance ${_money(transaction.balanceAfter, drawer.currencyCode)}\n${_dateTime(transaction.recordedAt)}',
                          ),
                          isThreeLine: true,
                        ),
                      )
                      .toList(growable: false),
                ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }, showSuccess: false);
}

Future<bool?> _formDialog(
  BuildContext context, {
  required String title,
  required List<Widget> fields,
}) => showDialog<bool>(
  context: context,
  builder: (context) => AlertDialog(
    title: Text(title),
    content: SizedBox(
      width: 420,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: fields
            .expand((field) => <Widget>[field, const SizedBox(height: 12)])
            .toList(growable: false),
      ),
    ),
    actions: <Widget>[
      TextButton(
        onPressed: () => Navigator.of(context).pop(false),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(true),
        child: const Text('Confirm'),
      ),
    ],
  ),
);

class _DialogField extends StatelessWidget {
  const _DialogField({
    required this.controller,
    required this.label,
    this.helper,
    this.maxLines = 1,
  });

  final TextEditingController controller;
  final String label;
  final String? helper;
  final int maxLines;

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    maxLines: maxLines,
    decoration: InputDecoration(
      labelText: label,
      helperText: helper,
      border: const OutlineInputBorder(),
    ),
  );
}

class _Detail extends StatelessWidget {
  const _Detail(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      children: <Widget>[
        SizedBox(width: 150, child: Text(label)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );
}

Future<void> _runCommand(
  BuildContext context,
  Future<void> Function() command, {
  bool showSuccess = true,
}) async {
  try {
    await command();
    if (!context.mounted || !showSuccess) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Operation completed.')));
  } catch (error) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(error.toString())));
  }
}

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

String _date(DateTime value) =>
    value.toUtc().toIso8601String().split('T').first;

String _dateTime(DateTime? value) =>
    value == null ? '-' : value.toLocal().toString().split('.').first;

String _money(int minor, String currencyCode) =>
    '$currencyCode ${(minor / 100).toStringAsFixed(2)}';
