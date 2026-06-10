# Tenancy and Authorization Schema

## Scope

This document records the Task 6 database foundation for tenant, outlet,
identity, role, permission, and outlet-scope data.

Implemented models:

- `Tenant`
- `Outlet`
- `UserAccount`
- `TenantMembership`
- `Role`
- `Permission`
- `MembershipRole`
- `RolePermission`
- `MembershipOutlet`
- `RefreshToken` (Task 7)

Task 8 extends `Tenant`, `Outlet`, and `UserAccount` rather than creating
duplicate entities.

Task 7 adds optional local password hashes to `UserAccount` and global,
revocable refresh-token records. MFA and platform-super-admin identity remain
outside the implemented scope.

## Ownership Model

`UserAccount` is a global login identity. A user can belong to multiple tenants
through `TenantMembership`.

`Permission` is a global platform-defined catalog. Roles are tenant-owned and
receive permissions through `RolePermission`.

The following tables are tenant-owned:

- `tenants` through its own primary key
- `outlets`
- `tenant_memberships`
- `roles`
- `membership_roles`
- `role_permissions`
- `membership_outlets`

Assignment-table foreign keys include `tenant_id`, preventing a membership,
role, or outlet from being linked across tenants.

## Identity Rules

- A user account requires at least one of email or phone.
- Email uniqueness is case-insensitive through PostgreSQL `citext`.
- Phone values use normalized E.164 format.
- A user has at most one membership per tenant.
- Membership status and `revoked_at` must agree.
- `password_hash` is optional so non-password identities remain possible.
- Local passwords use bcrypt and hashes are never returned by APIs.

## Role and Permission Rules

- Role names are case-insensitively unique inside a tenant.
- System role keys are unique inside a tenant.
- System roles require a lowercase `system_key`.
- Custom roles cannot claim a `system_key`.
- Permission keys use `module.action` format.
- Optional role-permission constraints must be JSON objects.
- Platform super-admin access is not represented by a tenant role.
- Platform access uses the global `UserAccount.is_platform_admin` flag and is
  emitted as `SUPER_ADMIN` in trusted JWT context.

## Tenant and Outlet Management Fields

Task 8 adds:

- Tenant legal name, contact email, phone, and positive `outlet_limit`
- Outlet contact and postal-address fields
- Tenant lifecycle statuses for inactive, trial, and expired tenants
- `TEMPORARILY_CLOSED` outlet status

## Outlet Scope

`MembershipOutlet` grants a tenant membership access to an outlet. The composite
foreign keys guarantee that both records belong to the same tenant.

An empty outlet assignment set does not automatically mean all outlets. The
authorization service must define and enforce any tenant-wide role behavior
explicitly when that layer is implemented.

## Identifiers and Concurrency

PostgreSQL generates time-ordered UUIDv7 identifiers through `app_uuid_v7()`.
The helper uses `pgcrypto` for random bytes.

Mutable master records carry a positive integer `version`:

- Tenant
- Outlet
- UserAccount
- TenantMembership
- Role

Application updates must use optimistic concurrency rather than silently
overwriting a stale version.

## Deletion Behavior

- Tenant, outlet, user, membership, and role relationships use restrictive
  foreign keys.
- Tenant, outlet, user, and role master records support soft deletion.
- Membership revocation uses status plus `revoked_at`.
- Security-bearing assignments must be removed explicitly.
- Deleting a parent never silently cascades an authorization change.

## Row-Level Security

Row-level security is enabled and forced for every tenant-owned table.

The API must set trusted tenant context inside each transaction:

```sql
SET LOCAL app.tenant_id = '<authenticated-tenant-uuid>';
```

Policies compare tenant ownership with `app_current_tenant_id()`. Without tenant
context, ordinary access to tenant-owned rows returns no rows and writes fail.

Authentication sets trusted `app.user_id` context after password validation.
The membership policy permits that user to discover only their own membership
candidates. The service then sets `app.tenant_id` before loading tenant-owned
roles and outlet assignments.

`user_accounts` and `permissions` are global tables and do not use tenant RLS.
Their access must be restricted through dedicated application services and
database privileges.

Tenant provisioning and controlled platform support require a separate,
explicitly privileged database path. They must not weaken ordinary tenant
policies.

Task 8 adds `app_is_platform_admin()` and updates tenant RLS policies to permit
trusted platform-admin transactions. Application services set this context only
from a signed JWT carrying the global platform-admin identity.

## Seed Strategy

`prisma/seed.ts` always idempotently upserts the global permission catalog.

Outside production it also creates a local demo tenant, outlet, tenant-admin
role, membership, outlet assignment, and bcrypt-protected
`admin@example.com` development user. Production seeding skips all demo data.

## Migration

Initial migration:

`backend/api/prisma/migrations/20260610120000_tenancy_authorization_foundation/migration.sql`

Authentication migration:

`backend/api/prisma/migrations/20260610150000_add_refresh_tokens/migration.sql`

Tenant/outlet management migration:

`backend/api/prisma/migrations/20260610180000_add_tenant_outlet_management/migration.sql`

Apply committed migrations:

```powershell
npm run prisma:migrate:deploy
```

Seed the global permission catalog:

```powershell
npm run db:seed
```

## Related Documents

- [Initial database ERD](initial-erd.md)
- [Database documentation](README.md)
- [System overview](../architecture/system-overview.md)
