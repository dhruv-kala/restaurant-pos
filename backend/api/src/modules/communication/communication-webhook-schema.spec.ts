import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('communication webhook schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260614180000_add_communication_webhooks/migration.sql'),
    'utf8',
  );

  it('defines immutable idempotent webhook history', () => {
    expect(schema).toContain('model CommunicationWebhook {');
    expect(migration).toContain('communication_webhooks_event_key');
    expect(migration).toContain('communication_webhooks_no_update');
    expect(migration).toContain('communication_webhooks_no_delete');
  });

  it('forces tenant isolation and tenant-aware provider/message/attempt references', () => {
    expect(migration).toContain(
      'ALTER TABLE "communication_webhooks" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain('communication_webhooks_tenant_id_provider_id_fkey');
    expect(migration).toContain('communication_webhooks_tenant_id_message_id_fkey');
    expect(migration).toContain('communication_webhooks_tenant_id_attempt_id_fkey');
  });
});
