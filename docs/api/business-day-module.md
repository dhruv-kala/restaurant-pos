# Business Day Module API

Task 31.1 adds outlet-scoped business day lifecycle endpoints.
Task 31.2 adds operational shift session lifecycle endpoints.
Task 31.3 adds cash drawer lifecycle and append-only drawer transactions.
Task 31.4 adds immutable shift cash reconciliation before shift closure.

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
- `POST /cash-drawers/open`
- `GET /cash-drawers`
- `GET /cash-drawers/current`
- `GET /cash-drawers/:id/transactions`
- `POST /cash-drawers/:id/transactions`
- `PATCH /cash-drawers/:id/close`
- `POST /shift-reconciliations`
- `GET /shift-reconciliations`
- `GET /shift-reconciliations/:id`

## Permissions

- `business_day.read`
- `business_day.open`
- `business_day.close`
- `shifts.read`
- `shifts.open`
- `shifts.close`
- `cash_drawer.read`
- `cash_drawer.open`
- `cash_drawer.adjust`
- `cash_drawer.close`
- `shift_reconciliation.read`
- `shift_reconciliation.create`

Tenant administrators and managers can operate business days.

## Invariants

- Only one `OPEN` business day can exist per tenant/outlet.
- Only one `OPEN` shift session can exist per tenant/assigned user.
- Only one `OPEN` cash drawer can exist per tenant/shift session.
- Only one shift reconciliation can exist per tenant/shift session.
- Only one shift reconciliation can exist per tenant/cash drawer.
- `businessDate` is stored as a date separate from timestamps.
- Closing business days, shift sessions, and cash drawers requires the current
  `version`.
- Closing a shift session requires a recorded shift reconciliation.
- Shift reconciliation requires a closed cash drawer.
- Non-zero cash variance requires approval notes.
- Closed business days are immutable.
- Closed shift sessions are immutable.
- Closed cash drawers are immutable.
- Cash drawer transactions are append-only.
- Shift reconciliations are immutable.
- Business days cannot be deleted.
- Shift sessions cannot be deleted.
- Cash drawers cannot be deleted.
