# Subscription Plan Management API

Base route: `/api/v1/subscriptions/plans`

All endpoints require a bearer token with the `SUPER_ADMIN` platform role.
Tenant roles cannot read or modify the platform plan catalog in Task 28.1.

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/subscriptions/plans` | Create draft version 1 with optional features |
| `GET` | `/subscriptions/plans` | List plan versions with status, code, search, and pagination filters |
| `GET` | `/subscriptions/plans/:id` | Read one plan version and its feature snapshot |
| `GET` | `/subscriptions/plans/:id/versions` | List all versions sharing the selected plan code |
| `PATCH` | `/subscriptions/plans/:id` | Update a draft or create the next draft from an activated version |
| `PUT` | `/subscriptions/plans/:id/features` | Replace a draft version's feature snapshot |
| `POST` | `/subscriptions/plans/:id/activate` | Activate a draft and deactivate the prior active version |
| `POST` | `/subscriptions/plans/:id/deactivate` | Deactivate an active version |

Mutable commands require the current integer `version`. A stale version returns
HTTP `409 Conflict`.

Prices use `priceMinor` plus a three-letter uppercase `currencyCode`. Feature
keys are normalized lowercase identifiers; optional `limitValue` fields are
non-negative integers. Limit enforcement is deferred to Task 28.4.
