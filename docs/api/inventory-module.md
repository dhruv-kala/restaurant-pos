# Inventory Module API

Base path: `/api/v1/inventory`

All endpoints require JWT bearer authentication and appear under the Swagger
`Inventory` tag.

## Access

| Role | Read | Write/receive |
|---|---:|---:|
| `SUPER_ADMIN` | Explicit tenant/outlet scope | Yes |
| `TENANT_ADMIN` | Own tenant | Yes |
| `MANAGER` | Own outlet | Yes |
| `INVENTORY_MANAGER` | Own outlet | Yes |
| `KITCHEN_STAFF` | Own outlet | No |
| `CASHIER`, `WAITER` | No | No |

## Master Data

- `GET/POST /inventory/categories`
- `PATCH /inventory/categories/:id`
- `GET/POST /inventory/units`
- `PATCH /inventory/units/:id`
- `POST/GET /inventory/ingredients`
- `GET/PATCH/DELETE /inventory/ingredients/:id`
- `POST/GET /inventory/vendors`
- `PATCH /inventory/vendors/:id`

Ingredient prices use integer minor units. Stock thresholds and unit conversion
factors use fixed-precision decimals.

## Stock

- `GET /inventory/stocks`
- `GET /inventory/stocks/:id`
- `POST /inventory/stocks/adjust`
- `POST /inventory/stocks/transfer`
- `GET /inventory/valuation`

Adjustments accept a positive quantity and one of `ADJUSTMENT_IN`,
`ADJUSTMENT_OUT`, `WASTAGE`, or `RETURN`. The service writes a signed,
append-only stock transaction and updates the outlet balance atomically.

Transfers create paired `TRANSFER_OUT` and `TRANSFER_IN` transactions sharing a
reference ID. Both outlets must belong to the same tenant and source stock must
be sufficient.

## Purchase Orders

- `POST/GET /inventory/purchase-orders`
- `GET/PATCH /inventory/purchase-orders/:id`
- `POST /inventory/purchase-orders/:id/receive`

Purchase order numbers use `PO-YYYYMMDD-00001` per outlet and day. Receiving is
allowed once from `PENDING` or `APPROVED`, locks the order, increments stock,
writes purchase transactions, and marks the order received in one transaction.

## Alerts

- `GET /inventory/alerts`
- `PATCH /inventory/alerts/:id/resolve`

Stock mutations maintain low-stock, out-of-stock, and negative-stock alert
states. Batches expiring within 30 days create expiry warnings. Only one
unresolved alert of a type may exist for an ingredient/outlet.

## Future Events

Typed publisher boundaries exist for `StockAdjusted`, `StockTransferred`,
`PurchaseOrderReceived`, and `InventoryAlertCreated`. Socket.IO transport is
intentionally not implemented in Task 19.
