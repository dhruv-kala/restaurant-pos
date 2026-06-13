# Trial Subscriptions API

Task 28.5 exposes tenant trial lifecycle operations under `/subscriptions`.

## Authorization

- `SUPER_ADMIN`: start, extend, expire, convert, and expire due trials
- `TENANT_ADMIN`: read trial records and trial history for the authenticated
  tenant

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/subscriptions/tenants/:tenantId/trials/start` | Start one tenant trial |
| GET | `/subscriptions/tenants/:tenantId/trials` | List tenant trials |
| GET | `/subscriptions/tenants/:tenantId/trials/:id` | Get one trial |
| GET | `/subscriptions/tenants/:tenantId/trials/:id/history` | List immutable trial events |
| POST | `/subscriptions/tenants/:tenantId/trials/:id/extend` | Extend an active trial |
| POST | `/subscriptions/tenants/:tenantId/trials/:id/expire` | Expire an active trial |
| POST | `/subscriptions/tenants/:tenantId/trials/:id/convert` | Convert a trial to paid active subscription |
| POST | `/subscriptions/trials/expire-due` | Expire all due active trials |

Mutation requests use idempotency keys. Extension, expiry, and conversion also
require the current trial `version`.

## Behavior

Starting a trial creates a linked `TenantSubscription` in `TRIAL` status.
Expiry updates the linked subscription to `EXPIRED`, so entitlement evaluation
fails closed through the existing subscription rules. Conversion updates the
same linked subscription to `ACTIVE` with the selected paid plan version.

The `expire-due` endpoint is designed for a future scheduler or admin job. Task
28.5 does not add a scheduler, queue, or new infrastructure.
