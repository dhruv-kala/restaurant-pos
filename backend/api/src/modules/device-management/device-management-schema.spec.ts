import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('device registry foundation schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260616120000_add_device_registry_foundation/migration.sql'),
    'utf8',
  );
  const enrollmentMigration = readFileSync(
    join(root, 'prisma/migrations/20260616130000_add_device_enrollment_activation/migration.sql'),
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

  it('defines enrollment requests and activation state history', () => {
    expect(schema).toContain('enum DeviceEnrollmentStatus {');
    expect(schema).toContain('model DeviceEnrollment {');
    expect(schema).toContain('deviceEnrollments');
    expect(enrollmentMigration).toContain('CREATE TYPE "device_enrollment_status"');
    expect(enrollmentMigration).toContain('CREATE TABLE "device_enrollments"');
    expect(enrollmentMigration).toContain('activation_code_hash');
    expect(enrollmentMigration).toContain('device_enrollments_one_active_per_device_key');
  });

  it('enforces enrollment tenant isolation and append-only history', () => {
    expect(enrollmentMigration).toContain(
      'ALTER TABLE "device_enrollments" FORCE ROW LEVEL SECURITY',
    );
    expect(enrollmentMigration).toContain('CREATE POLICY "device_enrollments_tenant_isolation"');
    expect(enrollmentMigration).toContain('reject_device_enrollment_delete');
    expect(enrollmentMigration).toContain('device enrollments cannot be deleted');
  });
});
