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
    expect(schema).toContain('requestFingerprint');
    expect(schema).toContain('redactedPayload');
  });

  it('forces RLS on outbox events', () => {
    expect(migration).toContain('ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "outbox_events_tenant_isolation"');
  });

  it('protects event identity and payload history', () => {
    expect(migration).toContain('outbox_events_immutable_identity');
    expect(migration).toContain('outbox_events_no_delete');
  });
});
