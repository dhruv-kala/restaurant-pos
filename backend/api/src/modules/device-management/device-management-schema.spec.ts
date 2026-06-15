import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('device registry foundation schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260616120000_add_device_registry_foundation/migration.sql'),
    'utf8',
  );

  it('defines tenant-scoped devices and statuses', () => {
    expect(schema).toContain('enum DeviceType {');
    expect(schema).toContain('enum DeviceStatus {');
    expect(schema).toContain('model Device {');
    expect(schema).toContain('devices                       Device[]');
    expect(migration).toContain('CREATE TYPE "device_type"');
    expect(migration).toContain('CREATE TYPE "device_status"');
    expect(migration).toContain("('PENDING', 'ACTIVE', 'DISABLED', 'REVOKED')");
  });

  it('enforces unique device identifiers and tenant/outlet foreign keys', () => {
    expect(schema).toContain('@@unique([tenantId, deviceIdentifier]');
    expect(migration).toContain('CREATE TABLE "devices"');
    expect(migration).toContain('devices_tenant_identifier_key');
    expect(migration).toContain('FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")');
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id")',
    );
  });

  it('enforces RLS and prevents hard deletion', () => {
    expect(migration).toContain('ALTER TABLE "devices" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "devices_tenant_isolation"');
    expect(migration).toContain('reject_device_delete');
    expect(migration).toContain('devices cannot be deleted');
  });
});
