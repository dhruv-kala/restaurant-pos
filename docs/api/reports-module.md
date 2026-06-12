# Reports Module API

All endpoints require JWT authentication and derive tenant/outlet scope from the
trusted session. Common filters are `fromDate`, `toDate`, `businessDate`,
`tenantId`, `outletId`, `paymentMethod`, `customerId`, `employeeId`, `groupBy`,
`page`, and `limit`.

## Catalog

- `GET /api/v1/reports/sales/summary`
- `GET /api/v1/reports/sales/daily`
- `GET /api/v1/reports/sales/monthly`
- `GET /api/v1/reports/sales/yearly`
- `GET /api/v1/reports/sales/items`
- `GET /api/v1/reports/sales/categories`
- `GET /api/v1/reports/gst/summary`
- `GET /api/v1/reports/gst/detailed`
- `GET /api/v1/reports/payments/summary`
- `GET /api/v1/reports/payments/methods`
- `GET /api/v1/reports/payments/refunds`
- `GET /api/v1/reports/outlets/performance`
- `GET /api/v1/reports/customers/top`
- `GET /api/v1/reports/customers/new`
- `GET /api/v1/reports/customers/repeat`
- `GET /api/v1/reports/inventory/value`
- `GET /api/v1/reports/inventory/consumption`
- `GET /api/v1/reports/inventory/wastage`
- `GET /api/v1/reports/inventory/low-stock`
- `GET /api/v1/reports/kitchen/performance`
- `GET /api/v1/reports/staff/performance`
- `GET /api/v1/reports/platform/summary`
- `GET /api/v1/dashboard`
- `POST /api/v1/reports/export`

`POST /reports/export` validates `PDF`, `EXCEL`, or `CSV`, records an immutable
audit entry, and returns `FOUNDATION_READY`. Rendering, object storage, and
delivery are intentionally deferred.

## Authorization

`SUPER_ADMIN` can aggregate across tenants. `TENANT_ADMIN` is restricted to its
tenant. `MANAGER` and operational roles are restricted to their authenticated
outlet. Cashiers can read financial summaries, waiters can only read their own
staff performance, and kitchen roles can only read kitchen performance.
