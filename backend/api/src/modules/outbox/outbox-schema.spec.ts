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

  it('defines the outbox event model and lifecycle enums', () => {
    expect(schema).toContain('enum OutboxEventScope');
    expect(schema).toContain('enum OutboxEventStatus');
    expect(schema).toContain('model OutboxEvent {');
    expect(schema).toContain('enum BackgroundJobStatus');
    expect(schema).toContain('enum BackgroundJobAttemptStatus');
    expect(schema).toContain('model BackgroundJob {');
    expect(schema).toContain('model BackgroundJobAttempt {');
    expect(schema).toContain('requestFingerprint');
    expect(schema).toContain('redactedPayload');
  });

  it('forces RLS on outbox events', () => {
    expect(migration).toContain('ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "outbox_events_tenant_isolation"');
    const jobsMigration = readFileSync(
      join(root, 'prisma/migrations/20260616190000_add_background_job_foundation/migration.sql'),
      'utf8',
    );
    expect(jobsMigration).toContain('ALTER TABLE "background_jobs" FORCE ROW LEVEL SECURITY');
    expect(jobsMigration).toContain(
      'ALTER TABLE "background_job_attempts" FORCE ROW LEVEL SECURITY',
    );
  });

  it('protects event identity and payload history', () => {
    expect(migration).toContain('outbox_events_immutable_identity');
    expect(migration).toContain('outbox_events_no_delete');
    const jobsMigration = readFileSync(
      join(root, 'prisma/migrations/20260616190000_add_background_job_foundation/migration.sql'),
      'utf8',
    );
    expect(jobsMigration).toContain('background_jobs_immutable_identity');
    expect(jobsMigration).toContain('background_job_attempts_no_delete');
  });
});
