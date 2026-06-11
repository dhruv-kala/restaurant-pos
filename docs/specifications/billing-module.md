# Billing Module Specification

## Workflow

```text
Completed Order -> Generated Bill -> Payment (Task 16) -> Invoice -> Completed
```

Task 15 owns bill snapshots and pre-payment lifecycle only. Payment allocation,
settlement, refunds, invoice assignment, and fiscal submission belong to Task
16 or later contracts.

## Total Rules

```text
grandTotal =
  subtotal
  - discountAmount
  - couponDiscountAmount
  + taxAmount
  + serviceChargeAmount
  + roundOffAmount
```

New bills round the pre-round total to the nearest whole rupee. Existing order
item taxes are authoritative snapshots; billing never reads current menu prices
or tax rates.

## GST

- Intrastate mode creates equal-rate CGST and SGST lines.
- Odd minor-unit tax amounts are deterministically split, with the remainder
  assigned to SGST.
- Interstate mode creates one IGST line.
- Named `BillTax` rows keep the design open for VAT, sales tax, and future
  country-specific rules.

## Split Rules

- Only `DRAFT` or `GENERATED` bills may be split.
- `EQUAL` requires `splitCount` and preserves the exact source grand total.
- `CUSTOM_AMOUNT` requires at least two minor-unit amounts whose sum equals the
  source grand total.
- `ITEM_BASED` requires every item exactly once with no duplicate assignment.
- The source is audited as `VOID`; replacements reference it in
  `sourceBillIds`.
- Amount-based splits use explicit share line items because payment allocation
  is not part of this module.

## Merge Rules

- At least two unsettled bills are required.
- All bills must belong to the same tenant and outlet.
- Bills must share either the same table or the same non-null customer.
- Items and tax lines are copied and aggregated without reading mutable source
  data.
- Source bills are audited as `VOID`; the merged bill records all source IDs.
- Exact source totals and accumulated round-off are preserved.

## Authorization

| Role | Read/Print | Generate/Update | Split/Merge/Void |
|---|---:|---:|---:|
| SUPER_ADMIN | Yes | Yes | Yes |
| TENANT_ADMIN | Own tenant | Yes | Yes |
| MANAGER | Own outlet | Yes | Yes |
| CASHIER | Own outlet | Yes | Yes |
| WAITER | Own outlet | No | No |
| KITCHEN_STAFF | No | No | No |

The Flutter guards are presentation controls only. NestJS authorization and
PostgreSQL RLS remain authoritative.

## Audit and Reprint

Generation stores user/time. Void stores user/time/reason. Printable reads
increment `printCount` and update `lastPrintedAt`; the API marks whether the
result is a reprint. PDF rendering is intentionally deferred.
