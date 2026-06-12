import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('communication infrastructure schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260614020000_add_communication_foundation/migration.sql'),
    'utf8',
  );

  it('defines provider-neutral communication records', () => {
    for (const model of ['CommunicationProvider', 'CommunicationMessage', 'CommunicationAttempt']) {
      expect(schema).toContain(`model ${model} {`);
    }
    expect(schema).not.toContain('model CommunicationTemplate {');
    expect(schema).not.toContain('model CommunicationWebhook {');
  });

  it('forces tenant isolation on every communication table', () => {
    for (const table of [
      'communication_providers',
      'communication_messages',
      'communication_attempts',
    ]) {
      expect(migration).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
    }
  });

  it('stores no plaintext recipient address or provider secret', () => {
    expect(schema).toContain('recipientAddressCiphertext');
    expect(schema).toContain('recipientAddressHash');
    expect(schema).toContain('recipientAddressMasked');
    expect(schema).toContain('secretReference');
    expect(schema).not.toContain('providerSecret');
    expect(schema).not.toContain('recipientAddress       String');
  });

  it('protects immutable communication history', () => {
    expect(migration).toContain('communication_messages_immutable_content');
    expect(migration).toContain('communication_attempts_no_delete');
  });
});
