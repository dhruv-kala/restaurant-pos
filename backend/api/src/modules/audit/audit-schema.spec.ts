import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Audit schema contract', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260613180000_add_audit_activity_logging',
      'migration.sql',
    ),
    'utf8',
  );

  it('defines immutable tenant-aware hash-chained audit events', () => {
    expect(schema).toContain('model AuditEvent');
    expect(schema).toContain('previousHash');
    expect(schema).toContain('eventHash');
    expect(schema).toContain('sequence           BigInt');
    expect(migration).toContain('audit_events_scope_check');
  });

  it('forces tenant isolation and rejects update and delete', () => {
    expect(migration).toContain('ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "audit_events_tenant_or_platform_isolation"');
    expect(migration).toContain('audit_events_immutable_update');
    expect(migration).toContain('audit_events_immutable_delete');
  });
});
