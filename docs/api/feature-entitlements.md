# Feature Entitlements API

Task 28.3 exposes tenant entitlement evaluation and override administration
under `/subscriptions/tenants/:tenantId/entitlements`.

## Authorization

- `SUPER_ADMIN`: read, create, update, and revoke any tenant override
- `TENANT_ADMIN`: read effective entitlements for the authenticated tenant
- Other tenant roles: no administration API access; business route guards use
  their trusted tenant context internally

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/subscriptions/tenants/:tenantId/entitlements` | List effective plan and override features |
| GET | `/subscriptions/tenants/:tenantId/entitlements/:featureKey` | Evaluate one feature |
| PUT | `/subscriptions/tenants/:tenantId/entitlements/:featureKey` | Create or replace an override |
| POST | `/subscriptions/tenants/:tenantId/entitlements/:featureKey/revoke` | Revoke an override and fall back to the plan |

Mutation requests require an idempotency key and reason. Updates and revocations
also require the current optimistic `version`.

## Effective Result

Evaluation returns:

- `enabled`
- `source`: `OVERRIDE`, `PLAN`, `NONE`, or `SUBSCRIPTION_INELIGIBLE`
- optional `limitValue` and metadata
- exact subscription and plan-version identity
- override state and effective period when an override exists

`limitValue` is descriptive until Task 28.4 adds centralized usage counters.
