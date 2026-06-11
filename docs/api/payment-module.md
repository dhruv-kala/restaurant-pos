# Payment API

Base path: `/api/v1/payments`

All endpoints require JWT authentication. `SUPER_ADMIN` may access all scoped
records, `TENANT_ADMIN` its tenant, `MANAGER` and `CASHIER` their outlet,
`WAITER` is read-only, and `KITCHEN_STAFF` is denied.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/payments` | Create one cash, UPI, card, wallet, gift-card, or bank-transfer payment |
| POST | `/payments/split` | Pay the full bill balance with two or more tenders |
| GET | `/payments` | List payment history with filters |
| GET | `/payments/:id` | Get payment, tender transactions, refunds, bill, and audit data |
| PATCH | `/payments/:id/status` | Advance a pending/processing gateway payment |
| POST | `/payments/:id/refund` | Create an idempotent completed refund |

List filters are `page`, `limit`, `status`, `paymentMethod`, `billId`,
`fromDate`, `toDate`, `referenceNumber`, `tenantId`, and `outletId`.

## Idempotency

Create, split, and refund commands require an `idempotencyKey`. The key is
unique per tenant/outlet for payments and per tenant/payment for refunds.
Repeating a completed command returns the existing aggregate without collecting
or refunding funds again.

## Tender Validation

- All amounts are positive integer minor units.
- A payment cannot exceed the bill outstanding balance.
- Cash requires `cashReceived >= amount`; change is calculated server-side.
- Card requires `cardLast4`.
- UPI requires `upiTransactionId` or `referenceNumber`.
- Split tender amounts must equal the exact outstanding balance.
- Gateway fields are nullable placeholders and are never trusted as proof of
  settlement by themselves.

Socket.IO is not implemented. `PaymentCreated`, `PaymentCompleted`,
`PaymentFailed`, and `PaymentRefunded` are typed no-op event contracts.
