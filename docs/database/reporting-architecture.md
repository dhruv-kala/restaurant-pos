# Reporting Architecture

Reports query operational PostgreSQL data through Prisma transactions with the
same forced-RLS request context used by transactional modules. No reporting
endpoint trusts tenant scope supplied by the client.

## Business Date

Financial and operational aggregation uses a stored `business_date` column, not
record creation timestamps. Task 22 adds this field to orders, bills, inventory
consumption, inventory wastage, and customer visits. Payments already carried
business date. Existing rows are backfilled using the outlet IANA timezone or
their linked payment/order business date.

The current runtime business-date writer retains the existing UTC calendar-day
behavior. A later shift-management task can centralize outlet cutoff rules
without rewriting historical report facts.

## Performance

Migration `20260613020000_add_reports_analytics` adds tenant/business-date/outlet
indexes for orders, bills, payments, customer visits, consumption, and wastage.
High-cardinality endpoints paginate detail rows and return chart-ready series.
Materialized views are not required at the current volume; the service boundary
allows adding daily fact views later without changing public DTOs.

## Audit

`report_generation_audits` stores report type, resolved tenant/outlet scope,
serialized filters, optional export format, generator user, and generation
timestamp. It is append-only by application contract and protected by forced
RLS, while platform reports may store a null tenant scope.
