import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('employee schema contract', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260613060000_add_employee_staff_management',
      'migration.sql',
    ),
    'utf8',
  );

  it.each([
    'EmployeeProfile',
    'Shift',
    'EmployeeShiftAssignment',
    'Attendance',
    'EmployeePerformance',
  ])('defines %s', (model) => {
    expect(schema).toContain(`model ${model}`);
  });

  it('extends existing users and tenant roles', () => {
    expect(schema).toContain('user               UserAccount');
    expect(schema).toContain('role               Role');
    expect(schema).toContain('@@unique([tenantId, userId])');
  });

  it('enforces one attendance row and one performance row per business day', () => {
    expect(schema).toMatch(
      /@@unique\(\[tenantId, employeeId, attendanceDate\](?:,\s+map:\s+"[^"]+")?\)/,
    );
    expect(schema).toMatch(
      /@@unique\(\[tenantId, employeeId, businessDate\](?:,\s+map:\s+"[^"]+")?\)/,
    );
  });

  it('adds audit actors, reporting indexes, constraints, and forced RLS', () => {
    expect(migration).toContain('assigned_by_user_id');
    expect(migration).toContain('recorded_by_user_id');
    expect(migration).toContain('attendance_reporting_idx');
    expect(migration).toContain('employee_performance_rating_check');
    expect(migration).toContain("EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY'");
  });
});
