# Payment Module Specification

## Status Flow

```text
PENDING -> PROCESSING -> SUCCESS
                    \-> FAILED
                    \-> CANCELLED

SUCCESS -> REFUNDED (when the complete payment amount is refunded)
```

Task 16 creates local tender payments as successful immediately. The status
endpoint exists for future asynchronous gateway attempts and only permits
transitions from `PENDING` or `PROCESSING`.

## Bill Payment State

```text
netPaid = paidAmount - refundedAmount
outstanding = max(grandTotal - netPaid, 0)
```

- `UNPAID`: no net payment
- `PARTIALLY_PAID`: net payment is positive but below the bill total
- `PAID`: net payment covers the bill total
- `REFUNDED`: every collected minor unit has been refunded

Bill reconciliation locks the bill row and updates these values in the same
database transaction as payment or refund changes. Bills with payment activity
cannot be edited, voided, split, or merged.

## Split Payment

- Any supported tender combination is allowed.
- At least two tenders are required.
- The sum must equal the current bill outstanding balance.
- One payment aggregate and one transaction per tender are created.
- Cash, card, and UPI validations apply independently to each tender.

## Partial Payment

A normal payment may be below the bill outstanding balance. The bill becomes
`PARTIALLY_PAID`, and additional idempotent payments may collect the remainder.

## Refunds

- Refund amount must be positive and cannot exceed the payment's unrefunded
  paid amount.
- Refunds are append-only compensating records.
- Task 16 completes refunds immediately while exposing an approval-workflow UI
  placeholder.
- Partial refunds reopen the bill balance; full refunds mark payment and bill
  refund state.

## Business Date

`businessDate` is stored separately from timestamps for shift/reporting
semantics. Task 16 uses the current UTC calendar day because outlet business-day
cutoff configuration does not yet exist. A later shift module must derive this
from outlet timezone and open shift.

## Authorization

| Role | Read | Collect/Update | Refund |
|---|---:|---:|---:|
| SUPER_ADMIN | Yes | Yes | Yes |
| TENANT_ADMIN | Own tenant | Yes | Yes |
| MANAGER | Own outlet | Yes | Yes |
| CASHIER | Own outlet | Yes | Yes |
| WAITER | Own outlet | No | No |
| KITCHEN_STAFF | No | No | No |

Flutter guards only control presentation. NestJS authorization and PostgreSQL
RLS are authoritative.
