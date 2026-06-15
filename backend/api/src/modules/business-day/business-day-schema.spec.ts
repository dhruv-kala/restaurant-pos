import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('business day foundation schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260616100000_add_business_day_foundation/migration.sql'),
    'utf8',
  );

  it('defines outlet-scoped business days', () => {
    expect(schema).toContain('enum BusinessDayStatus {');
    expect(schema).toContain('model BusinessDay {');
    expect(schema).toContain('businessDays                  BusinessDay[]');
    expect(schema).toContain('businessDays             BusinessDay[]');
    expect(schema).toContain('openedBusinessDays');
    expect(schema).toContain('closedBusinessDays');
  });

  it('defines operational shift sessions linked to business days', () => {
    expect(schema).toContain('enum ShiftSessionStatus {');
    expect(schema).toContain('model ShiftSession {');
    expect(schema).toContain('shiftSessions                 ShiftSession[]');
    expect(schema).toContain('assignedShiftSessions');
    expect(migration).toContain('CREATE TABLE "shift_sessions"');
    expect(migration).toContain('CREATE TYPE "shift_session_status"');
  });

  it('defines cash drawers and append-only cash drawer transactions', () => {
    expect(schema).toContain('enum CashDrawerStatus {');
    expect(schema).toContain('enum CashDrawerTransactionType {');
    expect(schema).toContain('model CashDrawer {');
    expect(schema).toContain('model CashDrawerTransaction {');
    expect(migration).toContain('CREATE TABLE "cash_drawers"');
    expect(migration).toContain('CREATE TABLE "cash_drawer_transactions"');
  });

  it('defines immutable shift reconciliations', () => {
    expect(schema).toContain('model ShiftReconciliation {');
    expect(schema).toContain('shiftReconciliations');
    expect(migration).toContain('CREATE TABLE "shift_reconciliations"');
    expect(migration).toContain('shift_reconciliations_shift_session_key');
    expect(migration).toContain('shift_reconciliations_cash_drawer_key');
  });

  it('creates business days with tenant constraints and forced RLS', () => {
    expect(migration).toContain('CREATE TABLE "business_days"');
    expect(migration).toContain('FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")');
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id")',
    );
    expect(migration).toContain('ALTER TABLE "business_days" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "business_days_tenant_isolation"');
  });

  it('enforces one open day per outlet and closed-day immutability', () => {
    expect(migration).toContain('business_days_one_open_per_outlet_key');
    expect(migration).toContain('WHERE "status" = \'OPEN\'');
    expect(migration).toContain('reject_closed_business_day_mutation');
    expect(migration).toContain('closed business days are immutable');
    expect(migration).toContain('business days cannot be deleted');
  });

  it('enforces one open shift session per user and closed-session immutability', () => {
    expect(migration).toContain('shift_sessions_one_open_per_user_key');
    expect(migration).toContain('WHERE "status" = \'OPEN\'');
    expect(migration).toContain('ALTER TABLE "shift_sessions" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "shift_sessions_tenant_isolation"');
    expect(migration).toContain('reject_closed_shift_session_mutation');
    expect(migration).toContain('closed shift sessions are immutable');
  });

  it('enforces one open drawer per shift and append-only transaction history', () => {
    expect(migration).toContain('cash_drawers_one_open_per_shift_key');
    expect(migration).toContain('ALTER TABLE "cash_drawers" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE "cash_drawer_transactions" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('reject_closed_cash_drawer_mutation');
    expect(migration).toContain('reject_cash_drawer_transaction_mutation');
    expect(migration).toContain('cash drawer transactions are append-only');
  });

  it('enforces tenant isolation and immutability for shift reconciliations', () => {
    expect(migration).toContain('ALTER TABLE "shift_reconciliations" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "shift_reconciliations_tenant_isolation"');
    expect(migration).toContain('reject_shift_reconciliation_mutation');
    expect(migration).toContain('shift reconciliations are immutable');
  });
});
