# Business Day Module API

Task 31.1 adds outlet-scoped business day lifecycle endpoints.
Task 31.2 adds operational shift session lifecycle endpoints.

All endpoints require JWT authentication. Tenant scope is resolved from the
authenticated user unless a platform administrator supplies `tenantId`.
Outlet-bound users can access only their assigned outlet.

## Endpoints

- `POST /business-days/open`
- `GET /business-days`
- `GET /business-days/current`
- `PATCH /business-days/:id/close`
- `POST /shift-sessions/open`
- `GET /shift-sessions`
- `GET /shift-sessions/current`
- `PATCH /shift-sessions/:id/close`

## Permissions

- `business_day.read`
- `business_day.open`
- `business_day.close`
- `shifts.read`
- `shifts.open`
- `shifts.close`

Tenant administrators and managers can operate business days.

## Invariants

- Only one `OPEN` business day can exist per tenant/outlet.
- Only one `OPEN` shift session can exist per tenant/assigned user.
- `businessDate` is stored as a date separate from timestamps.
- Closing business days and shift sessions requires the current `version`.
- Closed business days are immutable.
- Closed shift sessions are immutable.
- Business days cannot be deleted.
- Shift sessions cannot be deleted.
