# RBAC And User Management API

All endpoints require JWT bearer authentication and are versioned under the
configured `/api/v1` prefix.

## User Management

| Method | Path | Purpose |
|---|---|---|
| POST | `/rbac/users` | Create a tenant membership user with roles/outlets |
| POST | `/rbac/users/invite` | Create an invited membership without a password |
| GET | `/rbac/users` | Paginated user list |
| GET | `/rbac/users/:id` | User, roles, outlets, and tenant status |
| PATCH | `/rbac/users/:id` | Update safe profile fields |
| PATCH | `/rbac/users/:id/status` | Change tenant-local membership status |
| POST | `/rbac/users/:id/reset-password` | Initialize password reset |

User list filters: `page`, `limit`, `search`, `status`, `roleId`, `outletId`,
and `tenantId`. `tenantId` is accepted only for platform administration.

Password hashes are never selected into API responses. Reset creates a random
temporary secret, stores only its bcrypt hash, changes the membership to
`INVITED`, and returns a notification-delivery foundation without returning the
secret.

## Roles And Permissions

| Method | Path | Purpose |
|---|---|---|
| POST | `/rbac/roles` | Create a custom tenant role |
| GET | `/rbac/roles` | List roles and assignment counts |
| GET | `/rbac/roles/:id` | Get a role |
| PATCH | `/rbac/roles/:id` | Update a role |
| DELETE | `/rbac/roles/:id` | Archive an unassigned custom role |
| GET | `/rbac/permissions` | List active permissions |
| GET | `/rbac/permissions/grouped` | Group permissions by module |
| GET | `/rbac/roles/:id/permissions` | Get assigned permissions |
| POST | `/rbac/roles/:id/permissions` | Replace assigned permissions |

Permission responses expose `module`, `action`, stable `code`, description, and
active state. Authentication responses and access tokens include the effective
permission codes from assigned roles.

## User Access

| Method | Path | Purpose |
|---|---|---|
| GET | `/rbac/users/:id/roles` | Get assigned roles |
| POST | `/rbac/users/:id/roles` | Replace assigned roles |
| GET | `/rbac/users/:id/outlets` | Get assigned outlets |
| POST | `/rbac/users/:id/outlets` | Replace assigned outlets |

Assignment replacement is transactional and validates every supplied ID against
the target tenant.

## Authorization

- `SUPER_ADMIN`: cross-tenant administration when an explicit tenant is
  supplied; can modify system-role mappings.
- `TENANT_ADMIN`: full administration inside the authenticated tenant; cannot
  edit or delete system roles or grant platform-only permissions.
- `MANAGER`: read-only visibility for users in the authenticated outlet.
- Other roles: no RBAC API access.
