# Billing API

Base path: `/api/v1/billing`

All endpoints require JWT authentication. Tenant and outlet scope comes from the
authenticated context. `SUPER_ADMIN` may query all tenants, `TENANT_ADMIN` may
query its tenant, `MANAGER` and `CASHIER` are restricted to their outlet,
`WAITER` is read-only, and `KITCHEN_STAFF` has no access.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/billing/generate` | Generate an immutable bill snapshot from a completed order |
| GET | `/billing` | List bills with pagination and filters |
| GET | `/billing/:id` | Get bill, items, taxes, order, and audit data |
| PATCH | `/billing/:id` | Update unsettled bill-level customer, discount, service charge, or notes |
| POST | `/billing/:id/void` | Void an unsettled bill with a required reason |
| GET | `/billing/:id/print` | Return printable data and record print/reprint metadata |
| POST | `/billing/:id/split` | Replace an unsettled bill with split bills |
| POST | `/billing/merge` | Replace compatible unsettled bills with one merged bill |

List filters are `page`, `limit`, `status`, `billNumber`, `orderId`,
`fromDate`, `toDate`, `tenantId`, and `outletId`. Scope fields remain subject
to trusted authorization.

## Generation

`POST /billing/generate` accepts `orderId`, optional `billSource`,
`gstMode`, customer snapshots, bill-level discount, service charge, and notes.

- The order must exist in the caller's scope.
- The order must be `COMPLETED` and must not have an active bill.
- Prices, quantities, discounts, tax rates, tax amounts, preparation metrics,
  and item names are copied from order snapshots.
- `CGST_SGST` divides each tax rate and amount between CGST and SGST.
- `IGST` stores one IGST line per order tax rate.
- Numbering is atomic per outlet/day: `BILL-YYYYMMDD-00001`.

## Errors

Invalid lifecycle operations return `409 Conflict`. Invalid split/merge
composition returns `400 Bad Request`. Records outside authorized tenant/outlet
scope are returned as not found or forbidden according to the scope check.

Socket.IO is not implemented. `BillGenerated`, `BillPaid`, and `BillVoided`
event contracts are typed no-op placeholders for a later realtime task.
