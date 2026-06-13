import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('communication template schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260614060000_add_communication_templates/migration.sql'),
    'utf8',
  );

  it('defines tenant templates and immutable versions', () => {
    expect(schema).toContain('model CommunicationTemplate {');
    expect(schema).toContain('model CommunicationTemplateVersion {');
    expect(schema).toContain('templateVersionId');
    expect(migration).toContain('communication_template_versions_immutable');
  });

  it('forces tenant isolation on both template tables', () => {
    for (const table of ['communication_templates', 'communication_template_versions']) {
      expect(migration).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
    }
  });

  it('retains exact template version references on communication messages', () => {
    expect(migration).toContain('communication_messages_template_reference_check');
    expect(migration).toContain('communication_messages_tenant_id_template_version_id_fkey');
    expect(migration).toContain('"template_version_id"');
  });
});
