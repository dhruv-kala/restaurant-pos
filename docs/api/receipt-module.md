# Receipt and Invoice API

All endpoints require JWT authentication.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/receipts/generate` | Issue a receipt or tax invoice for a fully paid bill |
| GET | `/api/v1/receipts` | List scoped receipt history |
| GET | `/api/v1/receipts/invoices` | List tax invoices |
| GET | `/api/v1/receipts/:id` | Read receipt snapshot and print audit |
| POST | `/api/v1/receipts/:id/print` | Record first print |
| POST | `/api/v1/receipts/:id/reprint` | Record an authorized reprint |
| GET | `/api/v1/receipts/:id/pdf` | Stream an `application/pdf` rendering |

Generation accepts `billId`, optional `paymentId`, and `receiptType`. Customer
receipts and tax invoices are idempotent per bill and type. Receipt numbers use
`REC-YYYYMMDD-00001`; tax invoices use `INV-YYYYMMDD-00001`. Both counters are
independent per outlet.

Super admins can access all scoped records. Tenant admins access their tenant.
Managers and cashiers are outlet scoped and can generate or print. Waiters are
read-only. Kitchen staff have no access.
