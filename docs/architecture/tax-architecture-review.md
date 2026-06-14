# Tax Architecture Review

Date: 2026-06-14

Scope:

- Task 30.1 Tax Foundation
- Task 30.2 Tax Rules and Rates

## Summary

The Task 30.1 and 30.2 tax foundation is structurally ready for Task 30.3
Fiscal Policy Administration and Task 30.4 Tax Calculation Engine after one
correction: tenant-default tax rule mappings are now explicit through
`TaxMappingTarget.TENANT_DEFAULT`.

The review confirms tenant isolation, cross-tenant foreign key safety, forced
RLS, effective dating, and audit readiness for the current tax configuration
tables. Tax calculation and finalized bill stability still require immutable
calculation snapshots in Task 30.4.

## Findings

### Strengths

- Every tax configuration table carries `tenant_id`.
- Cross-tenant references use composite tenant-aware foreign keys.
- Forced RLS exists for `tax_profiles`, `tax_rates`, `tax_groups`,
  `tax_group_rates`, `tax_rules`, and `tax_category_mappings`.
- Tax rates use integer basis points instead of decimals.
- Tax groups can model combined GST components such as CGST plus SGST.
- Rate, group, rule, and mapping records carry `createdByUserId`,
  `updatedByUserId`, `version`, `createdAt`, and `updatedAt`.
- Mutating APIs use optimistic concurrency and write audit events.
- Active category/item mapping overlaps are rejected in service logic.

### Corrections Applied

| Severity | Issue | Correction | Migration required |
|---|---|---|---|
| High | The documented precedence required a tenant default rule fallback, but `TaxMappingTarget` only supported category and item targets. Future calculation would have needed an implicit fallback path. | Added `TENANT_DEFAULT` to `TaxMappingTarget`, allowed mappings with no menu target, added target consistency checks, service validation, lookup indexes, and tests. | Yes, corrected in Task 30.2 migration before live deployment |

### Remaining Risks

| Severity | Risk | Recommendation |
|---|---|---|
| Medium | Tax rates, groups, and rules can still be administratively edited before calculation snapshots exist. | Task 30.4 must snapshot applied rate/group/rule details into `TaxCalculationSnapshot` and bill/receipt tax lines. After bill finalization references exist, destructive edits should remain blocked or versioned through new effective-dated records. |
| Medium | Group composition can be changed through `rateIds`, which is acceptable for pre-calculation administration but not for finalized historical bills. | Task 30.4 should calculate from the effective rule at the bill instant and store a full immutable tax component snapshot. |
| Low | Mapping overlap prevention is enforced in service logic, not with exclusion constraints. | Keep tenant locking around mapping mutations. Consider PostgreSQL range exclusion constraints only if concurrent direct database writes become a supported path. |
| Low | `MenuItem.taxPercentage` still exists as legacy menu data. | Treat it as legacy until Task 30.4 explicitly migrates calculation to tax rules. Do not use it for new rule-based tax calculation. |

## Tenant Isolation

Verified:

- All reviewed tax tables include `tenant_id`.
- Tenant-owned child tables reference parents by `(tenant_id, id)` where
  cross-tenant links would otherwise be possible.
- RLS is enabled and forced for all current tax tables.
- Services resolve tenant scope from authenticated actor context and reject
  cross-tenant tenantId requests for non-platform actors.

No correction required.

## Outlet Compatibility

The current schema is compatible with future outlet fiscal policy because tax
configuration remains tenant scoped, while Task 30.3 can introduce
outlet-scoped policy tables that reference `tenant_id` and `outlet_id`.

Expected Task 30.3 shape:

- `OutletFiscalPolicy` should carry `tenant_id` and `outlet_id`.
- Outlet tax registrations should be outlet scoped.
- Invoice sequence configuration should be outlet and fiscal-period scoped.
- Fiscal policy should point to active tenant tax profiles or rules by
  tenant-aware references when needed.

No correction required in current tables.

## Tax Hierarchy

The model supports:

- GST
- CGST
- SGST
- IGST
- VAT
- Service Tax
- Cess

`TaxRate` stores each component. `TaxGroup` composes one or more active rates.
`TaxRule` points to a group, so combined structures such as CGST 2.5% plus SGST
2.5% are represented without duplicate rate rows.

No correction required beyond the tenant-default mapping addition.

## Effective Dates

Current behavior:

- Rates, groups, rules, and mappings carry `effective_from` and optional
  `effective_to`.
- Database checks enforce `effective_to > effective_from` where present.
- Active mapping overlap is rejected for the same tenant default, category, or
  item target.
- Future-dated records are supported.

Task 30.4 must evaluate records at the bill/order tax instant and snapshot the
result. Historical stability should not depend on reading mutable tax policy
tables after finalization.

## Menu Tax Mapping Precedence

The intended calculation precedence is:

1. Item rule
2. Category rule
3. Tenant default rule

Task 30.2.5 corrected the model so all three levels are first-class
`TaxCategoryMapping` targets:

- `ITEM`
- `CATEGORY`
- `TENANT_DEFAULT`

Task 30.4 should implement deterministic lookup in that order.

## Index Review

Current indexes support:

- profile/status lookups for rates and groups
- profile/status/priority lookups for rules
- rule-to-mapping lookup
- tenant target validity lookup for default/category/item mappings

No additional indexes are required before Task 30.3. Task 30.4 can add
calculation-specific indexes if query plans require them.

## Constraint Review

Verified:

- Stable per-profile codes for rates, groups, and rules.
- Tenant-aware unique identifiers.
- Basis-point tax rate range `0..10000`.
- Date range checks.
- Mapping target consistency checks.
- Positive version checks.

No additional constraint required for Task 30.3.

## Naming Review

`TaxCategoryMapping` now covers tenant default, category, and item targets. The
name is slightly narrow but still acceptable because the public API already uses
`/tax/category-mappings` and the entity owns menu-tax mapping behavior.
Renaming would create avoidable churn.

No rename recommended.

## Approval

Task 30.3 Fiscal Policy Administration may proceed after this review. Task 30.4
must implement immutable tax calculation snapshots before billing, receipts,
reports, or integrations depend on tax policy tables for historical values.
