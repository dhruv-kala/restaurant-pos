# Business Day, Shifts, Cash Drawer, and Closing Module

## Status

Partially implemented.

Task 31 is split into:

* Task 31.1 Business Day Foundation - Complete
* Task 31.2 Shift Management - Complete
* Task 31.3 Cash Drawer Management
* Task 31.4 Shift Closing and Reconciliation
* Task 31.5 Business Day Closing
* Task 31.6 Operations Administration UI

## Objective

Provide operational control over restaurant trading days, cashier shifts, cash drawers, and financial reconciliation.

The module controls:

* business dates
* shift lifecycle
* cash drawer lifecycle
* opening balances
* closing balances
* shift reconciliation
* business day closing

This module becomes the authoritative source for operational reporting.

## Ownership

* business day lifecycle
* shift lifecycle
* cash drawer lifecycle
* opening balances
* closing balances
* shift reconciliation
* day-end reconciliation

Billing, payments, and orders generate activity.

This module owns operational accountability.

## Data Model

Potential entities:

* BusinessDay - implemented in Task 31.1
* ShiftSession - implemented in Task 31.2
* CashDrawer
* CashDrawerTransaction
* ShiftReconciliation
* BusinessDayClosing

All tenant-owned records carry tenant scope.

Operational records are outlet scoped.

## Invariants

* Only one active business day per outlet.
* Only one active shift per user.
* Only one active cash drawer per shift.
* Business days are outlet scoped.
* Historical business days are immutable after closing.
* Shift reconciliation is append-only.
* Cash drawer history is append-only.
* Reports use businessDate.
* Cross-tenant access is prohibited.

## Authorization

* SUPER_ADMIN may inspect all.
* TENANT_ADMIN may manage tenant outlets.
* MANAGER may open/close business days and shifts.
* CASHIER may open and close assigned shifts.
* Backend authorization is authoritative.

Suggested permissions:

* `business_day.read`
* `business_day.open`
* `business_day.close`
* `shifts.read`
* `shifts.open`
* `shifts.close`
* `cash_drawer.open`
* `cash_drawer.close`
* `shift.reconciliation`

The lowercase dot-key convention matches the repository's RBAC seed pattern.

## API

Business Day Foundation:

* `POST /business-days/open`
* `GET /business-days`
* `GET /business-days/current`
* `PATCH /business-days/:id/close`

Task 31.1 implements tenant/outlet-scoped business days with
`BusinessDayStatus.OPEN` and `BusinessDayStatus.CLOSED`. Opening a business day
validates outlet ownership and active outlet status, rejects duplicate outlet
business dates, and enforces one open business day per outlet. Closing uses
optimistic `version` checks. Open and close actions write audit events.

Shift Management:

* `POST /shift-sessions/open`
* `GET /shift-sessions`
* `GET /shift-sessions/current`
* `PATCH /shift-sessions/:id/close`

Task 31.2 implements tenant/outlet-scoped operational shift sessions with
`ShiftSessionStatus.OPEN` and `ShiftSessionStatus.CLOSED`. A shift session is
assigned to a user, belongs to the outlet's current open business day, and may
reference an existing staff shift template from the employee module. Only one
open shift session is allowed per user. Closing uses optimistic `version`
checks. Open and close actions write audit events.

## Audit Requirements

Audit:

* shift opening
* shift closing
* business day opening
* business day closing
* opening balance changes
* closing balance changes
* reconciliation overrides

## Non-Goals

* payroll
* attendance
* employee scheduling
* accounting export

These belong to dedicated modules.
