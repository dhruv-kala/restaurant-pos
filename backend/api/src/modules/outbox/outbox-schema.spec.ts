import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('transactional outbox schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      root,
      'prisma/migrations/20260616180000_add_transactional_outbox_foundation/migration.sql',
    ),
    'utf8',
  );
  const jobsMigration = readFileSync(
    join(root, 'prisma/migrations/20260616190000_add_background_job_foundation/migration.sql'),
    'utf8',
  );
  const schedulerMigration = readFileSync(
    join(root, 'prisma/migrations/20260616200000_add_scheduler_foundation/migration.sql'),
    'utf8',
  );
  const recoveryMigration = readFileSync(
    join(root, 'prisma/migrations/20260616210000_add_job_recovery_controls/migration.sql'),
    'utf8',
  );

  it('defines the outbox event model and lifecycle enums', () => {
    expect(schema).toContain('enum OutboxEventScope');
    expect(schema).toContain('enum OutboxEventStatus');
    expect(schema).toContain('model OutboxEvent {');
    expect(schema).toContain('enum BackgroundJobStatus');
    expect(schema).toContain('enum BackgroundJobAttemptStatus');
    expect(schema).toContain('model BackgroundJob {');
    expect(schema).toContain('model BackgroundJobAttempt {');
    expect(schema).toContain('enum ScheduledJobStatus');
    expect(schema).toContain('enum ScheduledJobScheduleType');
    expect(schema).toContain('model ScheduledJob {');
    expect(schema).toContain('model ScheduledJobRun {');
    expect(schema).toContain('DEAD_LETTERED');
    expect(schema).toContain('enum JobDeadLetterStatus');
    expect(schema).toContain('model BackgroundJobRetryPolicy {');
    expect(schema).toContain('model JobDeadLetter {');
    expect(schema).toContain('requestFingerprint');
    expect(schema).toContain('redactedPayload');
  });

  it('forces RLS on outbox events', () => {
    expect(migration).toContain('ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "outbox_events_tenant_isolation"');
    expect(jobsMigration).toContain('ALTER TABLE "background_jobs" FORCE ROW LEVEL SECURITY');
    expect(jobsMigration).toContain(
      'ALTER TABLE "background_job_attempts" FORCE ROW LEVEL SECURITY',
    );
    expect(schedulerMigration).toContain('ALTER TABLE "scheduled_jobs" FORCE ROW LEVEL SECURITY');
    expect(schedulerMigration).toContain(
      'ALTER TABLE "scheduled_job_runs" FORCE ROW LEVEL SECURITY',
    );
    expect(recoveryMigration).toContain(
      'ALTER TABLE "background_job_retry_policies" FORCE ROW LEVEL SECURITY',
    );
    expect(recoveryMigration).toContain('ALTER TABLE "job_dead_letters" FORCE ROW LEVEL SECURITY');
  });

  it('protects event identity and payload history', () => {
    expect(migration).toContain('outbox_events_immutable_identity');
    expect(migration).toContain('outbox_events_no_delete');
    expect(jobsMigration).toContain('background_jobs_immutable_identity');
    expect(jobsMigration).toContain('background_job_attempts_no_delete');
    expect(schedulerMigration).toContain('scheduled_jobs_immutable_identity');
    expect(schedulerMigration).toContain('scheduled_job_runs_no_delete');
    expect(recoveryMigration).toContain('background_job_retry_policies_no_delete');
    expect(recoveryMigration).toContain('job_dead_letters_no_delete');
  });

  it('enforces scheduler due-window idempotency and schedule shape', () => {
    expect(schedulerMigration).toContain('scheduled_job_runs_job_due_key');
    expect(schedulerMigration).toContain('scheduled_job_runs_scope_idempotency_key');
    expect(schedulerMigration).toContain('scheduled_jobs_schedule_shape_check');
    expect(schedulerMigration).toContain('scheduled_job_runs_outlet_scope_check');
    expect(schedulerMigration).toContain('scheduled_jobs_scope_schedule_key');
  });

  it('defines recovery retry policies and dead-letter retention', () => {
    expect(recoveryMigration).toContain("ADD VALUE IF NOT EXISTS 'DEAD_LETTERED'");
    expect(recoveryMigration).toContain('background_job_retry_policies_scope_type_key');
    expect(recoveryMigration).toContain('job_dead_letters_job_id_key');
    expect(recoveryMigration).toContain('job_dead_letters_resolution_check');
  });
});
