# Tenant and Outlet Management API

## Scope

Task 8 implements protected tenant and outlet CRUD-style management contracts,
status transitions, pagination, search, tenant isolation, and outlet subscription
limits.

It does not implement subscription billing, plans, menu, orders, inventory,
payments, reports, loyalty, or Flutter screens.

## Roles

### `SUPER_ADMIN`

Platform access is represented by `UserAccount.isPlatformAdmin`, not a tenant
role. Authentication emits the `SUPER_ADMIN` access-token role for those global
users.

Platform administrators can manage and query all tenants and outlets.

### `TENANT_ADMIN`

Tenant administrators:

- Read only their JWT tenant
- Update permitted own-tenant profile fields
- Cannot update tenant status, slug, or outlet limit
- Create and manage outlets only in their JWT tenant
- Cannot submit another tenant ID

### `MANAGER`

Managers can list and view outlets in their JWT tenant. They cannot create or
modify tenants or outlets.

Other roles are rejected by the current minimal role checks.

## Tenant Endpoints

- `POST /api/v1/tenants`
- `GET /api/v1/tenants`
- `GET /api/v1/tenants/:id`
- `PATCH /api/v1/tenants/:id`
- `PATCH /api/v1/tenants/:id/status`

Tenant statuses:

- `ACTIVE`
- `INACTIVE`
- `SUSPENDED`
- `TRIAL`
- `EXPIRED`
- `CLOSED`

The existing `CLOSED` value remains supported for compatibility. Closing is a
terminal soft-delete transition.

## Outlet Endpoints

- `POST /api/v1/outlets`
- `GET /api/v1/outlets`
- `GET /api/v1/outlets/:id`
- `PATCH /api/v1/outlets/:id`
- `PATCH /api/v1/outlets/:id/status`
- `GET /api/v1/tenants/:tenantId/outlets`

Outlet statuses:

- `ACTIVE`
- `INACTIVE`
- `TEMPORARILY_CLOSED`
- `SUSPENDED`
- `CLOSED`

Outlets cannot be created directly as `CLOSED`. Closing is an explicit terminal
status transition.

## Pagination

List responses use:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Both lists accept `page`, `limit`, `search`, and `status`. Outlet lists also
accept `tenantId` for `SUPER_ADMIN` only.

## Outlet Limit

`Tenant.outletLimit` defaults to 1. Outlet creation runs in one database
transaction:

1. Establish trusted tenant or platform context.
2. Load the tenant and validate its status.
3. Count non-closed, non-deleted outlets.
4. Reject when the limit is reached.
5. Insert the outlet.

The error is:

```text
Outlet limit reached for current subscription plan
```

This is a minimal entitlement field, not a subscription-plan implementation.

## Tenant Isolation

Every service operation establishes PostgreSQL transaction-local context:

- `app.user_id`
- `app.tenant_id` for tenant users
- `app.is_platform_admin` for verified platform administrators

Tenant IDs submitted by tenant admins or managers are checked against the JWT
tenant before any query. PostgreSQL forced RLS remains the second enforcement
layer.
