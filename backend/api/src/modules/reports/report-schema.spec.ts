import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('reporting schema contract', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260613020000_add_reports_analytics',
      'migration.sql',
    ),
    'utf8',
  );

  it('defines append-only report generation audits', () => {
    expect(schema).toContain('model ReportGenerationAudit');
    expect(schema).toContain('reportType');
    expect(schema).toContain('generatedByUserId');
    expect(schema).toContain('generatedAt');
  });

  it.each([
    'orders',
    'bills',
    'inventory_consumptions',
    'inventory_wastages',
    'customer_visits',
  ])('adds business-date reporting to %s', (table) => {
    expect(migration).toContain(`ALTER TABLE "${table}" ADD COLUMN "business_date" DATE`);
  });

  it('adds reporting indexes and forced RLS', () => {
    expect(migration).toContain('payments_reporting_idx');
    expect(migration).toContain('report_generation_audits_catalog_idx');
    expect(migration).toContain(
      'ALTER TABLE "report_generation_audits" FORCE ROW LEVEL SECURITY',
    );
  });
});
