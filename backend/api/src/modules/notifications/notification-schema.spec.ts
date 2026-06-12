import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('notification database foundation', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260613220000_add_notification_center/migration.sql'),
    'utf8',
  );

  it('defines notification content, recipient state, and preferences', () => {
    expect(schema).toContain('model Notification {');
    expect(schema).toContain('model NotificationRecipient {');
    expect(schema).toContain('model NotificationPreference {');
  });

  it('forces tenant row-level security on all notification tables', () => {
    expect(migration).toContain('ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE "notification_recipients" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE "notification_preferences" FORCE ROW LEVEL SECURITY');
  });

  it('protects notification content from mutation and deletion', () => {
    expect(migration).toContain('CREATE TRIGGER "notifications_immutable_content"');
    expect(migration).toContain('CREATE TRIGGER "notifications_no_delete"');
  });
});
