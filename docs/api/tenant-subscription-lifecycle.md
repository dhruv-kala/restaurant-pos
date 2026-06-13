# Tenant Subscription Lifecycle API

Base route: `/api/v1/subscriptions/tenants`

Mutation endpoints require authenticated `SUPER_ADMIN` platform access.
`TENANT_ADMIN` may use read endpoints only for its authenticated tenant.

## Queries

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/subscriptions/tenants/:tenantId` | List current and historical subscription aggregates |
| `GET` | `/subscriptions/tenants/:tenantId/current` | Read the current trial, active, or suspended subscription |
| `GET` | `/subscriptions/tenants/:tenantId/history` | Read immutable lifecycle events |
| `GET` | `/subscriptions/tenants/:tenantId/subscriptions/:id` | Read one subscription aggregate |

## Commands

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/subscriptions/tenants/:tenantId/activate` | Activate an active plan version for a tenant |
| `POST` | `/subscriptions/tenants/:tenantId/subscriptions/:id/upgrade` | Change an active subscription to another active plan version |
| `POST` | `/subscriptions/tenants/:tenantId/subscriptions/:id/downgrade` | Change an active subscription to another active plan version |
| `POST` | `/subscriptions/tenants/:tenantId/subscriptions/:id/suspend` | Suspend an active subscription |
| `POST` | `/subscriptions/tenants/:tenantId/subscriptions/:id/resume` | Resume a suspended subscription |
| `POST` | `/subscriptions/tenants/:tenantId/subscriptions/:id/expire` | Expire a current subscription |
| `POST` | `/subscriptions/tenants/:tenantId/subscriptions/:id/cancel` | Cancel a current subscription |

Every command requires an `idempotencyKey`. Commands against an existing
aggregate also require its current integer `version`. Reusing an idempotency key
with different command data or sending a stale version returns HTTP
`409 Conflict`.

Upgrade and downgrade are explicit administrative classifications. Task 28.2
does not infer them from plan price because currency and billing interval may
differ.
