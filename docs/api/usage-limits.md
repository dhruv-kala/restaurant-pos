# Usage Limits API

Task 28.4 exposes subscription usage evaluation and reconciliation under
`/subscriptions/tenants/:tenantId/usage`.

## Authorization

- `SUPER_ADMIN`: read and reconcile any tenant counter
- `TENANT_ADMIN`: read counters and effective usage for the authenticated tenant
- Other tenant roles: business services consume usage internally using trusted
  authentication context

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/subscriptions/tenants/:tenantId/usage` | List persisted counters |
| GET | `/subscriptions/tenants/:tenantId/usage/:featureKey` | Evaluate the current period and limit |
| POST | `/subscriptions/tenants/:tenantId/usage/:featureKey/adjust` | Reconcile a counter |

Reconciliation requires a decimal-string `usageValue`, reason, idempotency key,
and the current version when updating an existing counter.

## Response Values

Usage, limits, and remaining quantities are decimal strings because PostgreSQL
stores counters as `BIGINT`.

Evaluation includes:

- entitlement status and source
- period and UTC boundaries
- usage, limit, and remaining values
- limit reached and over-limit state
- configured `BLOCK`, `WARN`, or `ALLOW` action
- whether another unit can be consumed

Business modules use `UsageLimitsService.consumeForActor()` for atomic,
idempotent enforcement. Consumption is not exposed as a public client endpoint.
