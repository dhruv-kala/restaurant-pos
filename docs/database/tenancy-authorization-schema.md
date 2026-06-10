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

Authentication credentials, JWT sessions, MFA, platform-super-admin identity,
and HTTP APIs are outside this task.

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
- Credentials and password hashes will be added with the authentication task,
  not to `UserAccount` in this schema task.

## Role and Permission Rules

- Role names are case-insensitively unique inside a tenant.
- System role keys are unique inside a tenant.
- System roles require a lowercase `system_key`.
- Custom roles cannot claim a `system_key`.
- Permission keys use `module.action` format.
- Optional role-permission constraints must be JSON objects.
- Platform super-admin access is not represented by a tenant role.

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

`user_accounts` and `permissions` are global tables and do not use tenant RLS.
Their access must be restricted through dedicated application services and
database privileges.

Tenant provisioning and controlled platform support require a separate,
explicitly privileged database path. They must not weaken ordinary tenant
policies.

## Seed Strategy

`prisma/seed.ts` idempotently upserts the initial global permission catalog.

It does not create:

- A tenant
- An outlet
- A user
- Credentials
- Tenant roles
- Membership assignments

Bootstrap of the first tenant and owner must be an explicit audited application
or administrative workflow in a later task.

## Migration

Initial migration:

`backend/api/prisma/migrations/20260610120000_tenancy_authorization_foundation/migration.sql`

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
