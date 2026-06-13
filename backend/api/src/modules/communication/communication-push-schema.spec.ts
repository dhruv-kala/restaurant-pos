import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('push notification delivery schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      root,
      'prisma/migrations/20260614140000_add_push_notification_delivery/migration.sql',
    ),
    'utf8',
  );

  it('defines protected tenant-scoped push devices', () => {
    expect(schema).toContain('model CommunicationPushDevice {');
    expect(schema).toContain('tokenCiphertext');
    expect(schema).toContain('tokenHash');
    expect(schema).not.toContain('token             String');
    expect(migration).toContain(
      'ALTER TABLE "communication_push_devices" FORCE ROW LEVEL SECURITY',
    );
  });

  it('enforces one active tenant token and prevents hard deletion', () => {
    expect(migration).toContain('communication_push_devices_active_token_key');
    expect(migration).toContain('WHERE "status" = \'ACTIVE\'');
    expect(migration).toContain('communication_push_devices_no_delete');
  });
});
