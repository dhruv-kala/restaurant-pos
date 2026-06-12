# Multi-Tenancy Rules

## Model

The system uses a shared PostgreSQL schema. `UserAccount` and approved platform
master data are global. Memberships, roles, outlets, and business data are
tenant-scoped.

## Required Rules

1. Every tenant-owned record carries `tenantId`.
2. Tenant-owned uniqueness includes `tenantId`.
3. Tenant-aware relations prevent cross-tenant references.
4. Trusted authentication establishes tenant context.
5. Request payloads cannot select an unauthorized tenant.
6. Every tenant query is scoped, including counts, existence checks, updates,
   and deletes.
7. RLS is forced on tenant-owned tables.
8. Outlet authorization is checked separately.
9. Jobs, files, caches, sockets, events, exports, and idempotency keys include
   tenant scope.
10. Cross-tenant platform operations are explicit and auditable.

## Query Rules

- Use tenant-scoped Prisma transactions/context helpers established by the
  repository.
- Scope `find`, `count`, `update`, `delete`, aggregate, and uniqueness checks.
- Validate referenced IDs in the same tenant before mutation.
- Do not use a globally unique ID as proof of tenant access.
- Platform queries must require platform authorization, not merely omit a
  tenant filter.

## Outlet Rules

- An active tenant membership does not imply access to every outlet.
- Tenant admins may have tenant-wide access according to the approved role
  contract.
- Managers and operational users are constrained by explicit outlet
  assignments.
- Outlet-filter query parameters may narrow authorized scope but never broaden
  it.

## Testing

Every new tenant-owned module should test:

- same-tenant success
- cross-tenant denial or invisibility
- unauthorized outlet denial
- cross-tenant reference rejection
- platform access only where explicitly supported
- RLS/schema ownership contracts

