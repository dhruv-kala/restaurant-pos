import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('WhatsApp delivery schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260614100000_add_whatsapp_delivery/migration.sql'),
    'utf8',
  );

  it('persists read status and timestamp without adding webhook storage', () => {
    expect(schema).toContain('READ');
    expect(schema).toContain('readAt');
    expect(schema).not.toContain('model CommunicationWebhook {');
    expect(migration).toContain('communication_messages_read_status_check');
  });

  it('indexes provider message identifiers for later callback resolution', () => {
    expect(migration).toContain('communication_attempts_provider_message_idx');
  });
});
