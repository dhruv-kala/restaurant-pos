# Order Module Specification

## Supported Order Types

- `DINE_IN`: requires an accessible available or reserved table.
- `TAKEAWAY`: no table.
- `DELIVERY`: no table and requires a customer ID.
- `QR_ORDER`: reserved future channel; customer optional and no table.

## Business Rules

1. The server owns order numbering and all total calculations.
2. Menu names, variant names, prices, and taxes are snapshots on order items.
3. Outlet-specific menu prices override tenant base prices.
4. Orders always contain at least one active item.
5. Completed and cancelled orders are immutable.
6. Cancelling a dine-in order releases its table.
7. Completing a dine-in order moves the table to `CLEANING`.
8. Transfer is atomic, dine-in only, and requires an `AVAILABLE` target.
9. Operational users cannot access another outlet.
10. Socket.IO is not implemented; typed `OrderCreated`, `OrderUpdated`, and
    `OrderStatusChanged` publisher placeholders define the future event seam.

## Kitchen Flow

The kitchen queue returns `PENDING`, `ACCEPTED`, and `PREPARING` orders oldest
first. Kitchen staff may read order details and advance status but cannot
create, edit, cancel, transfer, or change items.

## Flutter Flow

`apps/restaurant-app` provides:

1. Order list with number, table, type, status, total, and time.
2. Dine-in table selection and menu item quantities.
3. Order details and lifecycle actions.
4. Guest/notes editing.
5. Kitchen queue with item summaries and preparation age.

Riverpod providers are `activeOrdersProvider`, `orderDetailsProvider`, and
`kitchenQueueProvider`. Dio remains behind `OrdersRepository`.
