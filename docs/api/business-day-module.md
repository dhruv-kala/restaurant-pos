# Business Day Module API

Task 31.1 adds outlet-scoped business day lifecycle endpoints.

All endpoints require JWT authentication. Tenant scope is resolved from the
authenticated user unless a platform administrator supplies `tenantId`.
Outlet-bound users can access only their assigned outlet.

## Endpoints

- `POST /business-days/open`
- `GET /business-days`
- `GET /business-days/current`
- `PATCH /business-days/:id/close`

## Permissions

- `business_day.read`
- `business_day.open`
- `business_day.close`

Tenant administrators and managers can operate business days.

## Invariants

- Only one `OPEN` business day can exist per tenant/outlet.
- `businessDate` is stored as a date separate from timestamps.
- Closing requires the current `version`.
- Closed business days are immutable.
- Business days cannot be deleted.
