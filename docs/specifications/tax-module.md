# Tax Configuration and Fiscal Policy Module

## Status

Planned.

Task 30 is split into:

- Task 30.1 Tax Foundation
- Task 30.2 Tax Rules and Rates
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

- TaxProfile
- TaxRate
- TaxGroup
- TaxRule
- TaxCategoryMapping
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

- `TAX_VIEW`
- `TAX_CREATE`
- `TAX_UPDATE`
- `TAX_DELETE`
- `TAX_POLICY_MANAGE`
- `FISCAL_POLICY_VIEW`
- `FISCAL_POLICY_MANAGE`
- `TAX_REPORT_VIEW`

## API

Tax Foundation:

- `GET /tax/profiles`
- `POST /tax/profiles`
- `PATCH /tax/profiles/:id`

Tax Rates:

- `GET /tax/rates`
- `POST /tax/rates`
- `PATCH /tax/rates/:id`

Tax Groups:

- `GET /tax/groups`
- `POST /tax/groups`
- `PATCH /tax/groups/:id`

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