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
  const trustedSessionMigration = readFileSync(
    join(root, 'prisma/migrations/20260616140000_add_trusted_device_sessions/migration.sql'),
    'utf8',
  );
  const terminalMigration = readFileSync(
    join(root, 'prisma/migrations/20260616150000_add_terminal_management/migration.sql'),
    'utf8',
  );
  const securityPolicyMigration = readFileSync(
    join(root, 'prisma/migrations/20260616160000_add_device_security_policies/migration.sql'),
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

  it('defines trusted device sessions with token hashes', () => {
    expect(schema).toContain('enum TrustedSessionStatus {');
    expect(schema).toContain('model TrustedSession {');
    expect(schema).toContain('trustedSessions');
    expect(trustedSessionMigration).toContain('CREATE TYPE "trusted_session_status"');
    expect(trustedSessionMigration).toContain('CREATE TABLE "trusted_sessions"');
    expect(trustedSessionMigration).toContain('session_token_hash');
    expect(trustedSessionMigration).toContain('trusted_sessions_one_active_per_device_user_key');
  });

  it('enforces trusted session tenant isolation and append-only history', () => {
    expect(trustedSessionMigration).toContain(
      'ALTER TABLE "trusted_sessions" FORCE ROW LEVEL SECURITY',
    );
    expect(trustedSessionMigration).toContain('CREATE POLICY "trusted_sessions_tenant_isolation"');
    expect(trustedSessionMigration).toContain('reject_trusted_session_delete');
    expect(trustedSessionMigration).toContain('trusted sessions cannot be deleted');
  });

  it('defines outlet terminals and device assignment history', () => {
    expect(schema).toContain('enum TerminalType {');
    expect(schema).toContain('enum DeviceAssignmentStatus {');
    expect(schema).toContain('model Terminal {');
    expect(schema).toContain('model DeviceAssignment {');
    expect(terminalMigration).toContain('CREATE TABLE "terminals"');
    expect(terminalMigration).toContain('CREATE TABLE "device_assignments"');
    expect(terminalMigration).toContain('device_assignments_one_active_per_terminal_key');
    expect(terminalMigration).toContain('device_assignments_one_active_per_device_key');
  });

  it('enforces terminal tenant isolation and append-only assignments', () => {
    expect(terminalMigration).toContain('ALTER TABLE "terminals" FORCE ROW LEVEL SECURITY');
    expect(terminalMigration).toContain(
      'ALTER TABLE "device_assignments" FORCE ROW LEVEL SECURITY',
    );
    expect(terminalMigration).toContain('CREATE POLICY "terminals_tenant_isolation"');
    expect(terminalMigration).toContain('CREATE POLICY "device_assignments_tenant_isolation"');
    expect(terminalMigration).toContain('reject_device_assignment_delete');
    expect(terminalMigration).toContain('device assignments cannot be deleted');
  });

  it('defines tenant and outlet scoped device security policies', () => {
    expect(schema).toContain('enum DeviceSecurityPolicyStatus {');
    expect(schema).toContain('model DeviceSecurityPolicy {');
    expect(schema).toContain('deviceSecurityPolicies');
    expect(securityPolicyMigration).toContain('CREATE TYPE "device_security_policy_status"');
    expect(securityPolicyMigration).toContain('CREATE TABLE "device_security_policies"');
    expect(securityPolicyMigration).toContain('require_trusted_session');
    expect(securityPolicyMigration).toContain('session_timeout_minutes');
    expect(securityPolicyMigration).toContain('allowed_device_types');
    expect(securityPolicyMigration).toContain('device_security_policies_one_active_per_scope_key');
  });

  it('enforces device security policy tenant isolation and no hard delete', () => {
    expect(securityPolicyMigration).toContain(
      'ALTER TABLE "device_security_policies" FORCE ROW LEVEL SECURITY',
    );
    expect(securityPolicyMigration).toContain(
      'CREATE POLICY "device_security_policies_tenant_isolation"',
    );
    expect(securityPolicyMigration).toContain('reject_device_security_policy_delete');
    expect(securityPolicyMigration).toContain('device security policies cannot be deleted');
  });
});
