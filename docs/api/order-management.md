# Order Management API

All endpoints are under `/api/v1`, require bearer authentication, and use the
Swagger `Orders` tag.

## Authorization

- `SUPER_ADMIN`: all tenant/outlet scopes when explicitly supplied.
- `TENANT_ADMIN`: own tenant, optional outlet filter; writes require outlet.
- `MANAGER`, `WAITER`, and `CASHIER`: assigned outlet only.
- `KITCHEN_STAFF`: read orders and update order status only.
- `CUSTOMER`: denied.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/orders` | Create an order and price snapshots |
| `GET` | `/orders` | Filter and paginate orders |
| `GET` | `/orders/:id` | Read order, items, table, waiter, and totals |
| `PATCH` | `/orders/:id` | Update customer, waiter, guests, or notes |
| `PATCH` | `/orders/:id/status` | Advance the order lifecycle |
| `POST` | `/orders/:id/cancel` | Cancel with a required reason |
| `POST` | `/orders/:id/transfer` | Move a dine-in order to an available table |
| `POST` | `/orders/:id/items` | Add an item using current menu pricing |
| `PATCH` | `/order-items/:id` | Change quantity or instructions |
| `DELETE` | `/order-items/:id` | Soft-remove an item and recalculate |
| `GET` | `/orders/kitchen/queue` | List pending, accepted, and preparing orders |

Order filters are `page`, `limit`, `status`, `orderType`, `tableId`,
`waiterId`, `customerId`, `fromDate`, `toDate`, `search`, `tenantId`, and
`outletId`.

## Numbering And Totals

Order numbers use `ORD-YYYYMMDD-00001`. An outlet/day counter is incremented
inside the creation transaction, and order number uniqueness is enforced per
outlet.

The server selects an outlet override price when present, adds a selected
variant adjustment, calculates tax from the menu tax percentage, and stores
immutable item name, variant, price, tax, and total snapshots. All money values
are integer minor units.

## Lifecycle

`PENDING -> ACCEPTED -> PREPARING -> READY -> SERVED -> COMPLETED`.

`READY -> COMPLETED` is also permitted for takeaway and delivery handoff.
Cancellation is available from every nonterminal stage through the dedicated
cancel endpoint. Completed orders cannot be cancelled or edited.
