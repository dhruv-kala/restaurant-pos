# Tax Configuration and Fiscal Policy Module

## Status

Partially implemented.

Task 30 is split into:

- Task 30.1 Tax Foundation - Complete
- Task 30.2 Tax Rules and Rates - Complete
- Task 30.2.5 Tax Architecture Review and Correction - Complete
- Task 30.3 Fiscal Policy Administration
- Task 30.4 Tax Calculation Engine
- Task 30.5 Tax Reporting Foundation
- Task 30.6 Tax Admin UI

## Objective

Provide tenant-isolated tax and fiscal policy administration for restaurant billing, receipts, reports, and future government integrations.

The module controls:

- tax profiles
- GST/VAT/service tax rules
- outlet tax configuration
- item/category tax mappings
- fiscal invoice rules
- tax calculation snapshots
- tax reporting foundations

## Ownership

- tax types
- tax rates
- tax groups
- outlet fiscal configuration
- item/category tax mappings
- tax calculation rules
- tax snapshots used in bills and invoices

Billing owns the bill lifecycle.

Tax module owns tax policy and tax calculation.

## Data Model

Potential entities:

- TaxProfile - implemented in Task 30.1
- TaxRate - implemented in Task 30.2
- TaxGroup - implemented in Task 30.2
- TaxRule - implemented in Task 30.2
- TaxCategoryMapping - implemented in Task 30.2 and corrected in Task 30.2.5
- OutletFiscalPolicy
- FiscalInvoiceSequence
- TaxCalculationSnapshot

All tenant-owned records carry tenant scope and use forced PostgreSQL row-level security.

## Supported Tax Models

Initial support:

- GST
- CGST
- SGST
- IGST
- VAT
- Service Charge
- Inclusive Tax
- Exclusive Tax
- Zero-Rated Tax
- Exempt Tax

## Invariants

- Tax calculation must be deterministic.
- Bills and receipts must store tax snapshots.
- Historical bills must not change when tax rules change.
- Tax rules are tenant scoped.
- Outlet fiscal policies are outlet scoped.
- Cross-tenant tax configuration access is prohibited.
- Invoice number sequences must be unique per outlet and fiscal year.
- Tax reports must use businessDate, not only createdAt.

## Authorization

- `SUPER_ADMIN` may inspect tax configuration across tenants.
- `TENANT_ADMIN` may manage tenant tax configuration.
- `MANAGER` may view outlet fiscal configuration if permitted.
- `CASHIER` may view applied tax but cannot change policy.
- Backend authorization is authoritative.

Suggested permissions:

- `tax.read`
- `tax.profile_manage`
- `tax.policy_manage`
- `tax.report_view`
- `fiscal_policy.read`
- `fiscal_policy.manage`

The lowercase dot-key convention matches the repository's RBAC seed pattern.

## API

Tax Foundation:

- `GET /tax/profiles`
- `GET /tax/profiles/default`
- `GET /tax/profiles/:id`
- `POST /tax/profiles`
- `PATCH /tax/profiles/:id`

Task 30.1 implements tenant-scoped tax profiles with `TaxType`, `TaxMode`, and
`TaxProfileStatus`. A tenant may have only one active default tax profile.
Profile mutations use optimistic `version` checks and write audit events.

Tax Rates:

- `GET /tax/rates`
- `POST /tax/rates`
- `GET /tax/rates/:id`
- `PATCH /tax/rates/:id`

Tax Groups:

- `GET /tax/groups`
- `POST /tax/groups`
- `GET /tax/groups/:id`
- `PATCH /tax/groups/:id`

Tax Rules:

- `GET /tax/rules`
- `POST /tax/rules`
- `GET /tax/rules/:id`
- `PATCH /tax/rules/:id`

Tax Category and Item Mappings:

- `GET /tax/category-mappings`
- `POST /tax/category-mappings`
- `GET /tax/category-mappings/:id`
- `PATCH /tax/category-mappings/:id`

Task 30.2 implements tenant-scoped tax rates, rate groups, rules, and menu
category/item mappings. Tax rates store exact basis-point values and immutable
classification fields after creation. Groups are composed from active rates in
the same profile. Active mapping date ranges cannot overlap for the same menu
category or item. All mutations use optimistic `version` checks and write audit
events.

Task 30.2.5 reviewed the tax architecture before fiscal policy and calculation
work. The review added first-class tenant default mappings through
`TaxMappingTarget.TENANT_DEFAULT` so the future calculation precedence is:

1. Item rule
2. Category rule
3. Tenant default rule

The review report is recorded in `docs/architecture/tax-architecture-review.md`.

Fiscal Policy:

- `GET /tax/fiscal-policies`
- `POST /tax/fiscal-policies`
- `PATCH /tax/fiscal-policies/:id`

Calculation:

- `POST /tax/calculate`

Reporting:

- `GET /tax/reports/summary`
- `GET /tax/reports/detailed`

Endpoint availability depends on which Task 30.x implementation has been completed.

## Flutter

Admin Tax Center:

- tax profile management
- tax rate management
- tax group management
- outlet fiscal policy management
- tax calculation preview
- tax reports foundation

Restaurant App:

- view applied tax on bill
- view invoice tax breakdown

Shared:

- tax models
- typed Dio API client
- Riverpod providers

## Audit Requirements

Audit:

- tax profile creation
- tax profile changes
- tax rate changes
- fiscal policy changes
- invoice sequence changes
- tax rule activation/deactivation

Tax calculation requests do not need audit unless used for bill finalization.

## Non-Goals

- government e-invoice integration
- fiscal device integration
- accounting export
- tax filing automation
- country-specific compliance certification

These belong to future modules.
