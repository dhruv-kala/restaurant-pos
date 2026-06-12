# Reports and Analytics Specification

## Metrics

Sales reports expose collected sales net of refunds, gross subtotal, net sales
after discounts, taxes, order count, average order value, and refund totals.
GST reports aggregate immutable bill tax snapshots. Payment reports aggregate
successful tender transactions and append-only refunds. Item/category reports
use bill snapshots and current configured cost as the foundation for margin
analysis.

Inventory value uses current stock and ingredient cost. Consumption and
wastage reports use immutable movement cost snapshots. Customer reports use
payment-driven visits. Kitchen reports compare actual and estimated preparation
minutes. Staff reports combine waiter order ownership and cashier collections.

## Dashboard

`GET /dashboard` returns today's sales, orders, distinct customers, average
order value, top items, unresolved stock alerts, pending orders, and current
inventory value. Values are API-driven and chart-library neutral.

## Security

Backend authorization is authoritative. Cross-tenant scope is rejected before
queries execute, RLS is applied inside every report transaction, and outlet
roles cannot widen outlet scope. Waiter staff reports force `employeeId` to the
authenticated user.

## Future BI

Public report DTOs use named metrics and series points suitable for line, bar,
pie, and trend rendering. Future custom report builders should compile approved
dimensions/measures into server-owned queries; they must not accept arbitrary
SQL or client-defined tenant predicates.
