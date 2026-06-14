# Database Standards

## Ownership

- Every tenant-owned table carries `tenantId`.
- Outlet-owned records also carry `outletId` and retain tenant scope.
- Global master data must be explicitly identified as global.
- Tenant context comes from authenticated server context, not request fields.
- Use composite tenant-aware foreign keys where practical.

## Configuration Scope

Before creating configuration entities, determine whether configuration belongs to:

- Platform Scope
- Tenant Scope
- Outlet Scope
- User Scope

Preferred hierarchy:

Platform
→ Tenant Default
→ Outlet Override
→ User Preference

Use Tenant scope for:

- tax profiles
- loyalty policies
- promotion definitions
- communication templates
- inventory policies

Use Outlet scope for:

- fiscal policies
- invoice sequences
- kitchen configuration
- receipt configuration
- device assignments
- outlet-specific promotions

Use User scope for:

- notification preferences
- dashboard preferences
- language preferences

New modules must explicitly evaluate configuration scope before schema design.

## Identifiers and Time

- Use UUIDv7/time-sortable UUIDs for primary identifiers.
- Allow client-generated IDs only for approved offline aggregates.
- Store instants in UTC with `timestamptz` semantics.
- Store tenant/outlet timezone configuration as IANA names.
- Store business date separately where operational reporting requires it.

## Money and Quantities

- Money is integer minor units plus an ISO currency code.
- Never use floating point for money.
- Inventory quantities use explicit decimal precision and units.
- Settled totals and commercial descriptions are immutable snapshots.

## Lifecycle and Audit Fields

Mutable master data normally includes:

- `createdAt`
- `updatedAt`
- an active/status field
- `deletedAt` only when soft deletion is appropriate
- `version` where concurrent or offline editing is possible

Transactional history uses append-only records and explicit actor/time fields.
Corrections use compensating records.

## Deletion

- Do not cascade-delete financial, stock, loyalty, fiscal, or audit history.
- Use restrictive foreign keys for referenced transactional records.
- Use soft deletion only for suitable master data.
- Never rewrite historical attribution after user deactivation.

## Constraints and Indexes

- Put invariant-critical rules in PostgreSQL constraints.
- Tenant-owned uniqueness begins with tenant scope.
- Index tenant plus common filter/order columns.
- Add outlet, business-date, status, and reference indexes based on query paths.
- Avoid speculative indexes without a query or integrity reason.
- Apply and test forced RLS for tenant-owned tables.

## Migrations

- Every Prisma schema change requires a committed migration.
- Migration names describe the domain change.
- Production uses migration deployment, never schema push.
- Backfills must be deterministic and safe for existing data.
- Do not edit already-deployed migrations.
- Record when a migration could not be executed against PostgreSQL.

## Seeds

- Seeds are idempotent and environment-aware.
- Use stable natural keys or deterministic identifiers with `upsert`.
- Production seeds may create global master data only.
- Demo tenants, credentials, menus, inventory, and customers are forbidden in
  production.

