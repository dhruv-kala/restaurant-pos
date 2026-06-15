import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/jobs_query.dart';
import '../providers/jobs_providers.dart';

class JobsAdminScreen extends ConsumerStatefulWidget {
  const JobsAdminScreen({super.key});

  @override
  ConsumerState<JobsAdminScreen> createState() => _JobsAdminScreenState();
}

class _JobsAdminScreenState extends ConsumerState<JobsAdminScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  late final TextEditingController _tenantId;
  final _outletId = TextEditingController();
  final _filter = TextEditingController();
  OutboxWorkScope _scope = OutboxWorkScope.tenant;
  BackgroundJobStatus? _jobStatus;
  JobDeadLetterStatus? _deadLetterStatus = JobDeadLetterStatus.open;
  ScheduledJobStatus? _scheduleStatus;
  OutboxEventStatus? _outboxStatus;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authNotifierProvider).user;
    _tenantId = TextEditingController(text: user?.tenantId ?? '');
    _tabs = TabController(length: 6, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _tenantId.dispose();
    _outletId.dispose();
    _filter.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).user;
    final isSuperAdmin = user?.hasRole(UserRole.superAdmin) == true;
    final scope = _currentScope(isSuperAdmin, user?.tenantId);
    final canRetry = _hasAny(user, const ['jobs.retry', 'jobs.manage']);
    final canManageJobs = _hasAny(user, const ['jobs.manage']);
    final canManageDeadLetters = _hasAny(user, const [
      'jobs.dead_letter_manage',
      'jobs.manage',
    ]);
    final canManageScheduler = _hasAny(user, const ['scheduler.manage']);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Jobs and scheduler operations'),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Dashboard'),
            Tab(text: 'Jobs'),
            Tab(text: 'Dead letters'),
            Tab(text: 'Schedules'),
            Tab(text: 'Retry policies'),
            Tab(text: 'Outbox'),
          ],
        ),
      ),
      body: Column(
        children: [
          _ScopeBar(
            tenantId: _tenantId,
            outletId: _outletId,
            filter: _filter,
            scope: _scope,
            isSuperAdmin: isSuperAdmin,
            onScopeChanged: (value) => setState(() => _scope = value),
            onChanged: () => setState(() {}),
          ),
          Expanded(
            child: scope == null
                ? const _EmptyState(
                    message:
                        'Enter a tenant ID for tenant-scoped operations, or switch to platform scope.',
                  )
                : TabBarView(
                    controller: _tabs,
                    children: [
                      _DashboardTab(scope: scope),
                      _JobsTab(
                        scope: scope,
                        status: _jobStatus,
                        filter: _emptyToNull(_filter.text),
                        canRetry: canRetry,
                        canCancel: canManageJobs,
                        onStatusChanged: (value) =>
                            setState(() => _jobStatus = value),
                      ),
                      _DeadLettersTab(
                        scope: scope,
                        status: _deadLetterStatus,
                        canRetry: canRetry,
                        canResolve: canManageDeadLetters,
                        onStatusChanged: (value) =>
                            setState(() => _deadLetterStatus = value),
                      ),
                      _SchedulesTab(
                        scope: scope,
                        status: _scheduleStatus,
                        filter: _emptyToNull(_filter.text),
                        canManage: canManageScheduler,
                        onStatusChanged: (value) =>
                            setState(() => _scheduleStatus = value),
                      ),
                      _RetryPoliciesTab(
                        scope: scope,
                        filter: _emptyToNull(_filter.text),
                        canManage: canManageJobs,
                      ),
                      _OutboxTab(
                        scope: scope,
                        status: _outboxStatus,
                        filter: _emptyToNull(_filter.text),
                        onStatusChanged: (value) =>
                            setState(() => _outboxStatus = value),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  JobOpsScope? _currentScope(bool isSuperAdmin, String? userTenantId) {
    final scope = isSuperAdmin ? _scope : OutboxWorkScope.tenant;
    final tenantId = scope == OutboxWorkScope.platform
        ? null
        : (isSuperAdmin ? _tenantId.text.trim() : userTenantId ?? '');
    if (scope == OutboxWorkScope.tenant &&
        (tenantId == null || tenantId.isEmpty)) {
      return null;
    }
    return JobOpsScope(
      scope: scope,
      tenantId: tenantId,
      outletId: _emptyToNull(_outletId.text),
    );
  }
}

class _ScopeBar extends StatelessWidget {
  const _ScopeBar({
    required this.tenantId,
    required this.outletId,
    required this.filter,
    required this.scope,
    required this.isSuperAdmin,
    required this.onScopeChanged,
    required this.onChanged,
  });

  final TextEditingController tenantId;
  final TextEditingController outletId;
  final TextEditingController filter;
  final OutboxWorkScope scope;
  final bool isSuperAdmin;
  final ValueChanged<OutboxWorkScope> onScopeChanged;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(12),
    child: Wrap(
      spacing: 12,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        SizedBox(
          width: 180,
          child: DropdownButtonFormField<OutboxWorkScope>(
            initialValue: scope,
            decoration: const InputDecoration(
              labelText: 'Scope',
              border: OutlineInputBorder(),
            ),
            items: OutboxWorkScope.values
                .map(
                  (value) => DropdownMenuItem(
                    value: value,
                    child: Text(value.wireName),
                  ),
                )
                .toList(),
            onChanged: isSuperAdmin
                ? (value) => onScopeChanged(value ?? scope)
                : null,
          ),
        ),
        SizedBox(
          width: 300,
          child: TextField(
            controller: tenantId,
            enabled: isSuperAdmin && scope == OutboxWorkScope.tenant,
            decoration: const InputDecoration(
              labelText: 'Tenant ID',
              border: OutlineInputBorder(),
            ),
            onSubmitted: (_) => onChanged(),
          ),
        ),
        SizedBox(
          width: 300,
          child: TextField(
            controller: outletId,
            enabled: scope == OutboxWorkScope.tenant,
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
            controller: filter,
            decoration: const InputDecoration(
              labelText: 'Job type / schedule / event',
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

class _DashboardTab extends ConsumerWidget {
  const _DashboardTab({required this.scope});

  final JobOpsScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final failedJobs = ref.watch(
      backgroundJobsProvider(
        BackgroundJobQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          scope: scope.scope,
          status: BackgroundJobStatus.failed,
          limit: 1,
        ),
      ),
    );
    final deadLetteredJobs = ref.watch(
      backgroundJobsProvider(
        BackgroundJobQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          scope: scope.scope,
          status: BackgroundJobStatus.deadLettered,
          limit: 1,
        ),
      ),
    );
    final openDeadLetters = ref.watch(
      jobDeadLettersProvider(
        JobDeadLetterQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          scope: scope.scope,
          status: JobDeadLetterStatus.open,
          limit: 1,
        ),
      ),
    );
    final pausedSchedules = ref.watch(
      scheduledJobsProvider(
        ScheduledJobQuery(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          scope: scope.scope,
          status: ScheduledJobStatus.paused,
          limit: 1,
        ),
      ),
    );
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Text(
          'Operational health',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _MetricCard(label: 'Failed jobs', value: _total(failedJobs)),
            _MetricCard(
              label: 'Dead-lettered jobs',
              value: _total(deadLetteredJobs),
            ),
            _MetricCard(
              label: 'Open dead letters',
              value: _total(openDeadLetters),
            ),
            _MetricCard(
              label: 'Paused schedules',
              value: _total(pausedSchedules),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Card(
          child: ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Recovery controls are intentionally narrow'),
            subtitle: Text(
              'This console can inspect work, retry or cancel jobs, resolve dead letters, and pause or resume schedules. It does not create job definitions or scheduler workflows.',
            ),
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 220,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.headlineMedium),
          ],
        ),
      ),
    ),
  );
}

class _JobsTab extends ConsumerWidget {
  const _JobsTab({
    required this.scope,
    required this.status,
    required this.filter,
    required this.canRetry,
    required this.canCancel,
    required this.onStatusChanged,
  });

  final JobOpsScope scope;
  final BackgroundJobStatus? status;
  final String? filter;
  final bool canRetry;
  final bool canCancel;
  final ValueChanged<BackgroundJobStatus?> onStatusChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = BackgroundJobQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      scope: scope.scope,
      status: status,
      jobType: filter,
    );
    final value = ref.watch(backgroundJobsProvider(query));
    return _AsyncPage<BackgroundJob>(
      title: 'Background jobs',
      value: value,
      emptyMessage: 'No background jobs found.',
      filter: _EnumFilter<BackgroundJobStatus>(
        label: 'Status',
        value: status,
        values: BackgroundJobStatus.values,
        nameOf: (value) => value.wireName,
        onChanged: onStatusChanged,
      ),
      itemBuilder: (context, job) => ListTile(
        leading: Icon(_jobIcon(job.status)),
        title: Text('${job.jobType} · ${job.status.wireName}'),
        subtitle: Text(
          'Scope ${job.scope.wireName} · attempts ${job.attemptCount}/${job.maxAttempts}\n'
          'Available ${_dateTime(job.availableAt)}',
        ),
        isThreeLine: true,
        trailing: Wrap(
          spacing: 8,
          children: [
            IconButton(
              tooltip: 'Details',
              icon: const Icon(Icons.open_in_new),
              onPressed: () => _showJobDetails(context, ref, job),
            ),
            if (canRetry && _canRetry(job.status))
              TextButton(
                onPressed: () => _retryJob(context, ref, job),
                child: const Text('Retry'),
              ),
            if (canCancel && _canCancel(job.status))
              TextButton(
                onPressed: () => _cancelJob(context, ref, job),
                child: const Text('Cancel'),
              ),
          ],
        ),
      ),
    );
  }
}

class _DeadLettersTab extends ConsumerWidget {
  const _DeadLettersTab({
    required this.scope,
    required this.status,
    required this.canRetry,
    required this.canResolve,
    required this.onStatusChanged,
  });

  final JobOpsScope scope;
  final JobDeadLetterStatus? status;
  final bool canRetry;
  final bool canResolve;
  final ValueChanged<JobDeadLetterStatus?> onStatusChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = JobDeadLetterQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      scope: scope.scope,
      status: status,
    );
    final value = ref.watch(jobDeadLettersProvider(query));
    return _AsyncPage<JobDeadLetter>(
      title: 'Dead letters',
      value: value,
      emptyMessage: 'No dead letters found.',
      filter: _EnumFilter<JobDeadLetterStatus>(
        label: 'Status',
        value: status,
        values: JobDeadLetterStatus.values,
        nameOf: (value) => value.wireName,
        onChanged: onStatusChanged,
      ),
      itemBuilder: (context, deadLetter) => ListTile(
        leading: const Icon(Icons.report_problem),
        title: Text('${deadLetter.reasonCode} · ${deadLetter.status.wireName}'),
        subtitle: Text(
          'Job ${deadLetter.jobId}\nFailed ${_dateTime(deadLetter.failedAt)}',
        ),
        isThreeLine: true,
        trailing: deadLetter.status == JobDeadLetterStatus.open
            ? Wrap(
                spacing: 8,
                children: [
                  if (canRetry)
                    TextButton(
                      onPressed: () =>
                          _retryDeadLetter(context, ref, deadLetter),
                      child: const Text('Retry'),
                    ),
                  if (canResolve)
                    TextButton(
                      onPressed: () =>
                          _resolveDeadLetter(context, ref, deadLetter),
                      child: const Text('Resolve'),
                    ),
                ],
              )
            : null,
      ),
    );
  }
}

class _SchedulesTab extends ConsumerWidget {
  const _SchedulesTab({
    required this.scope,
    required this.status,
    required this.filter,
    required this.canManage,
    required this.onStatusChanged,
  });

  final JobOpsScope scope;
  final ScheduledJobStatus? status;
  final String? filter;
  final bool canManage;
  final ValueChanged<ScheduledJobStatus?> onStatusChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ScheduledJobQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      scope: scope.scope,
      status: status,
      scheduleKey: filter,
      jobType: filter,
    );
    final value = ref.watch(scheduledJobsProvider(query));
    return _AsyncPage<ScheduledJob>(
      title: 'Scheduled jobs',
      value: value,
      emptyMessage: 'No schedules found.',
      filter: _EnumFilter<ScheduledJobStatus>(
        label: 'Status',
        value: status,
        values: ScheduledJobStatus.values,
        nameOf: (value) => value.wireName,
        onChanged: onStatusChanged,
      ),
      itemBuilder: (context, schedule) => Card(
        child: ExpansionTile(
          leading: Icon(
            schedule.status == ScheduledJobStatus.active
                ? Icons.schedule
                : Icons.pause_circle,
          ),
          title: Text('${schedule.displayName} · ${schedule.status.wireName}'),
          subtitle: Text(
            '${schedule.scheduleKey} · ${schedule.jobType}\nNext run ${_dateTime(schedule.nextRunAt)}',
          ),
          trailing: canManage
              ? _ScheduleAction(schedule: schedule)
              : const SizedBox.shrink(),
          children: [
            if (schedule.runs.isEmpty)
              const ListTile(title: Text('No recent runs included.')),
            for (final run in schedule.runs.take(5))
              ListTile(
                title: Text(run.status),
                subtitle: Text(
                  'Due ${_dateTime(run.dueAt)} · triggered ${_dateTime(run.triggeredAt)}',
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ScheduleAction extends ConsumerWidget {
  const _ScheduleAction({required this.schedule});

  final ScheduledJob schedule;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (schedule.status == ScheduledJobStatus.disabled) {
      return const SizedBox.shrink();
    }
    final isPaused = schedule.status == ScheduledJobStatus.paused;
    return TextButton(
      onPressed: () => _run(context, ref, () async {
        final repository = ref.read(jobsRepositoryProvider);
        if (isPaused) {
          await repository.resumeSchedule(schedule);
        } else {
          await repository.pauseSchedule(schedule);
        }
      }),
      child: Text(isPaused ? 'Resume' : 'Pause'),
    );
  }
}

class _RetryPoliciesTab extends ConsumerWidget {
  const _RetryPoliciesTab({
    required this.scope,
    required this.filter,
    required this.canManage,
  });

  final JobOpsScope scope;
  final String? filter;
  final bool canManage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = RetryPolicyQuery(
      tenantId: scope.tenantId,
      scope: scope.scope,
      jobType: filter,
    );
    final value = ref.watch(retryPoliciesProvider(query));
    return value.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _ErrorState(error: error),
      data: (policies) => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Retry policies',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              if (canManage)
                FilledButton.icon(
                  onPressed: () => _showPolicyDialog(context, ref, scope),
                  icon: const Icon(Icons.tune),
                  label: const Text('Upsert policy'),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (policies.isEmpty)
            const _EmptyState(message: 'No retry policies found.'),
          for (final policy in policies)
            ListTile(
              leading: const Icon(Icons.repeat),
              title: Text(policy.jobType),
              subtitle: Text(
                '${policy.scope.wireName} · max ${policy.maxAttempts} attempts\n'
                'Initial ${policy.initialDelaySeconds}s · max ${policy.maxDelaySeconds}s · x${policy.backoffMultiplier}',
              ),
              isThreeLine: true,
            ),
        ],
      ),
    );
  }
}

class _OutboxTab extends ConsumerWidget {
  const _OutboxTab({
    required this.scope,
    required this.status,
    required this.filter,
    required this.onStatusChanged,
  });

  final JobOpsScope scope;
  final OutboxEventStatus? status;
  final String? filter;
  final ValueChanged<OutboxEventStatus?> onStatusChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = OutboxEventQuery(
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      scope: scope.scope,
      status: status,
      eventType: filter,
    );
    final value = ref.watch(outboxEventsProvider(query));
    return _AsyncPage<OutboxEvent>(
      title: 'Outbox events',
      value: value,
      emptyMessage: 'No outbox events found.',
      filter: _EnumFilter<OutboxEventStatus>(
        label: 'Status',
        value: status,
        values: OutboxEventStatus.values,
        nameOf: (value) => value.wireName,
        onChanged: onStatusChanged,
      ),
      itemBuilder: (context, event) => ListTile(
        leading: Icon(
          event.status == OutboxEventStatus.processed
              ? Icons.done_all
              : Icons.outbox,
        ),
        title: Text('${event.eventType} · ${event.status.wireName}'),
        subtitle: Text(
          'Scope ${event.scope.wireName} · aggregate ${event.aggregateType ?? 'none'}\n'
          'Available ${_dateTime(event.availableAt)}',
        ),
        isThreeLine: true,
      ),
    );
  }
}

class _AsyncPage<T> extends StatelessWidget {
  const _AsyncPage({
    required this.title,
    required this.value,
    required this.emptyMessage,
    required this.itemBuilder,
    this.filter,
  });

  final String title;
  final AsyncValue<PaginatedResponse<T>> value;
  final String emptyMessage;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final Widget? filter;

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
            ?filter,
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

class _EnumFilter<T extends Object> extends StatelessWidget {
  const _EnumFilter({
    required this.label,
    required this.value,
    required this.values,
    required this.nameOf,
    required this.onChanged,
  });

  final String label;
  final T? value;
  final List<T> values;
  final String Function(T value) nameOf;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 220,
    child: DropdownButtonFormField<T?>(
      initialValue: value,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      items: [
        DropdownMenuItem<T?>(value: null, child: const Text('All')),
        ...values.map(
          (item) =>
              DropdownMenuItem<T?>(value: item, child: Text(nameOf(item))),
        ),
      ],
      onChanged: onChanged,
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
      child: Text('Failed to load job operations data: $error'),
    ),
  );
}

Future<void> _showJobDetails(
  BuildContext context,
  WidgetRef ref,
  BackgroundJob job,
) async {
  final detail = await ref.read(jobsRepositoryProvider).jobDetail(job);
  if (!context.mounted) return;
  await showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('${detail.job.jobType} details'),
      content: SizedBox(
        width: 560,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Field('Status', detail.job.status.wireName),
              _Field('Scope', detail.job.scope.wireName),
              _Field('Idempotency key', detail.job.idempotencyKey),
              _Field('Last error', detail.job.lastErrorMessage ?? 'None'),
              const Divider(),
              Text('Attempts', style: Theme.of(context).textTheme.titleMedium),
              if (detail.attempts.isEmpty) const Text('No attempts recorded.'),
              for (final attempt in detail.attempts)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    '#${attempt.attemptNumber} · ${attempt.status.wireName}',
                  ),
                  subtitle: Text(
                    '${attempt.workerId}\n${attempt.errorMessage ?? 'No error'}',
                  ),
                ),
              if (detail.deadLetter != null) ...[
                const Divider(),
                _Field('Dead letter', detail.deadLetter!.reasonCode),
                _Field(
                  'Reason',
                  detail.deadLetter!.reasonMessage ?? 'No message',
                ),
              ],
            ],
          ),
        ),
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

Future<void> _retryJob(
  BuildContext context,
  WidgetRef ref,
  BackgroundJob job,
) async {
  final reason = await _reasonDialog(context, 'Retry job');
  if (!context.mounted || reason == null) return;
  await _run(
    context,
    ref,
    () => ref.read(jobsRepositoryProvider).retryJob(job, reason: reason),
  );
}

Future<void> _retryDeadLetter(
  BuildContext context,
  WidgetRef ref,
  JobDeadLetter deadLetter,
) async {
  final reason = await _reasonDialog(context, 'Retry dead-lettered job');
  if (!context.mounted || reason == null) return;
  await _run(
    context,
    ref,
    () => ref
        .read(jobsRepositoryProvider)
        .retryDeadLetter(deadLetter, reason: reason),
  );
}

Future<void> _cancelJob(
  BuildContext context,
  WidgetRef ref,
  BackgroundJob job,
) async {
  final reason = await _reasonDialog(context, 'Cancel job');
  if (!context.mounted || reason == null) return;
  await _run(
    context,
    ref,
    () => ref.read(jobsRepositoryProvider).cancelJob(job, reason: reason),
  );
}

Future<void> _resolveDeadLetter(
  BuildContext context,
  WidgetRef ref,
  JobDeadLetter deadLetter,
) async {
  final note = await _reasonDialog(context, 'Resolve dead letter');
  if (!context.mounted || note == null) return;
  await _run(
    context,
    ref,
    () => ref
        .read(jobsRepositoryProvider)
        .resolveDeadLetter(deadLetter, resolutionNote: note),
  );
}

Future<void> _showPolicyDialog(
  BuildContext context,
  WidgetRef ref,
  JobOpsScope scope,
) async {
  final jobType = TextEditingController();
  final maxAttempts = TextEditingController(text: '5');
  final initialDelay = TextEditingController(text: '30');
  final maxDelay = TextEditingController(text: '900');
  final multiplier = TextEditingController(text: '2');
  final submitted = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Upsert retry policy'),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: jobType,
                decoration: const InputDecoration(labelText: 'Job type'),
              ),
              TextField(
                controller: maxAttempts,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Max attempts'),
              ),
              TextField(
                controller: initialDelay,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Initial delay seconds',
                ),
              ),
              TextField(
                controller: maxDelay,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Max delay seconds',
                ),
              ),
              TextField(
                controller: multiplier,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Backoff multiplier',
                ),
              ),
            ],
          ),
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
  if (!context.mounted || submitted != true) return;
  await _run(
    context,
    ref,
    () => ref
        .read(jobsRepositoryProvider)
        .upsertRetryPolicy(
          tenantId: scope.tenantId,
          scope: scope.scope,
          jobType: jobType.text.trim(),
          maxAttempts: int.tryParse(maxAttempts.text.trim()) ?? 5,
          initialDelaySeconds: int.tryParse(initialDelay.text.trim()) ?? 30,
          maxDelaySeconds: int.tryParse(maxDelay.text.trim()) ?? 900,
          backoffMultiplier: int.tryParse(multiplier.text.trim()) ?? 2,
        ),
  );
}

Future<String?> _reasonDialog(BuildContext context, String title) {
  final controller = TextEditingController();
  return showDialog<String?>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: TextField(
        controller: controller,
        maxLines: 3,
        decoration: const InputDecoration(
          labelText: 'Reason',
          border: OutlineInputBorder(),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(controller.text.trim()),
          child: const Text('Submit'),
        ),
      ],
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
    ref
      ..invalidate(backgroundJobsProvider)
      ..invalidate(jobDeadLettersProvider)
      ..invalidate(scheduledJobsProvider)
      ..invalidate(retryPoliciesProvider)
      ..invalidate(outboxEventsProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Job operation completed.')));
    }
  } catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Job operation failed: $error')));
    }
  }
}

class _Field extends StatelessWidget {
  const _Field(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text('$label: $value'),
  );
}

bool _hasAny(dynamic user, List<String> permissions) =>
    user?.hasRole(UserRole.superAdmin) == true ||
    user?.hasRole(UserRole.tenantAdmin) == true ||
    permissions.any((permission) => user?.hasPermission(permission) == true);

String _total<T>(AsyncValue<PaginatedResponse<T>> value) => value.when(
  loading: () => '...',
  error: (_, _) => '!',
  data: (page) => page.meta.total.toString(),
);

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

String _dateTime(DateTime value) => value.toLocal().toString();

bool _canRetry(BackgroundJobStatus status) =>
    status == BackgroundJobStatus.failed ||
    status == BackgroundJobStatus.deadLettered ||
    status == BackgroundJobStatus.cancelled;

bool _canCancel(BackgroundJobStatus status) =>
    status == BackgroundJobStatus.pending ||
    status == BackgroundJobStatus.retrying ||
    status == BackgroundJobStatus.processing;

IconData _jobIcon(BackgroundJobStatus status) => switch (status) {
  BackgroundJobStatus.succeeded => Icons.check_circle,
  BackgroundJobStatus.failed => Icons.error,
  BackgroundJobStatus.deadLettered => Icons.report,
  BackgroundJobStatus.cancelled => Icons.cancel,
  BackgroundJobStatus.processing => Icons.sync,
  BackgroundJobStatus.retrying => Icons.replay,
  BackgroundJobStatus.pending => Icons.pending,
};
