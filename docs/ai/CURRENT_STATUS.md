# Current Status

Last updated: 2026-06-15

## Current Position

- Completed through: **Task 31.3**
- Current module: **Business Day, Shifts, Cash Drawer, and Closing**
- Next provisional task: **Task 31.4 - Shift Closing and Reconciliation**
- Later roadmap entries: **Provisional until explicitly approved**
- Task 28.1-28.6 repair review on 2026-06-14 found no communication-module
  leakage in subscription implementation; one shared Dart response contract was
  corrected to match the subscription backend.

## Completed Tasks

| Range | Result |
|---|---|
| 1-5 | Repository, architecture, ERD, NestJS, PostgreSQL, and Prisma foundations |
| 6-10 | Tenancy authorization, authentication, tenant/outlet APIs, shared Flutter packages, and login/navigation |
| 11-18 | Menu, tables, orders, billing, payments, receipts, and complete kitchen/KDS workflows |
| 19-23 | Inventory, recipes/consumption, customers, reports, and employee/staff management |
| 23.5 | Master-data and environment-aware seed framework |
| 24 | RBAC and user management |
| 24.5 | AI-first documentation, standards, task index, and prompt framework |
| 25 | Immutable audit ledger, hash-chain integrity, protected APIs, security/RBAC/report integrations, and admin explorer |
| 26 | Tenant/outlet/user in-app notifications, recipient/read state, preferences, publishing APIs, shared clients, and Flutter notification centers |
| 27.1 | Provider/message/attempt schema, protected addressing, idempotent enqueue service, abstraction contracts, and state rules |
| 27.2 | Tenant template CRUD, immutable versions, strict placeholder preview/rendering, authorization, audit integration, and exact message version references |
| 27.3 | SMTP execution, protected recipient decryption, delivery attempts/status, history APIs, authorization, and audit events |
| 27.4 | Twilio SMS execution, E.164 validation, shared delivery orchestration, attempt/status tracking, and audit events |
| 27.5 | Twilio WhatsApp approved-template execution, protected credentials, delivery/read state foundation, and audit events |
| 27.6 | FCM HTTP v1 delivery, encrypted tenant/user device registration, invalid-token deactivation, and audit events |
| 27.7 | Verified provider webhooks, immutable idempotent event history, and monotonic delivery-state synchronization |
| 27.8 | Provider administration APIs, shared communication clients, and admin dashboard/template/history/provider screens |
| 27.9 | Tenant/outlet communication KPIs, channel/provider performance, delivery trends, typed clients, and admin reporting |
| 28.1 | Global versioned plan catalog, feature snapshots, immutable activated versions, platform APIs, and audit events |
| 28.2 | Tenant subscription lifecycle, exact plan references, idempotent commands, append-only history, RLS, and audit events |
| 28.3 | Tenant feature overrides, fail-closed evaluation, route guard/decorator enforcement, RLS, and audit events |
| 28.4 | Tenant usage counters, immutable operations, atomic enforcement, configurable over-limit policies, RLS, and audit events |
| 28.5 | Trial subscriptions, immutable trial history, extension, expiry, paid conversion, RLS, and audit events |
| 28.6 | Shared subscription contracts, typed clients, Riverpod providers, and admin plan/subscription/entitlement/usage/trial screens |
| 29.1 | Tenant discount policies, deterministic percentage/fixed calculations, immutable application snapshots, RBAC foundation, RLS, and audit events |
| 29.2 | Tenant coupon definitions, normalized codes, validity/status management, read-only validation, usage-limit foundation, RLS, RBAC, and audit events |
| 29.3 | Tenant promotion campaigns, selected-outlet targeting, campaign rules, activation/deactivation, read-only evaluation, RLS, RBAC, and audit events |
| 29.4 | Central discount eligibility service, context validation, explicit denial reasons, deterministic candidate evaluation, and conservative stacking enforcement |
| 29.5 | Append-only promotion redemptions, idempotent creation, coupon usage counters, per-customer usage limits, bill-level history, RLS, and audit events |
| 29.6 | Shared promotions contracts, typed API client, Riverpod providers, and admin dashboard/policy/coupon/campaign/preview/redemption screens |
| 30.1 | Tenant-scoped tax profiles, tax type/mode enums, active default enforcement, protected APIs, RLS, RBAC, and audit events |
| 30.2 | Tenant-scoped tax rates, groups, rules, category/item mappings, effective dating, overlap prevention, RLS, and audit events |
| 30.2.5 | Formal tax architecture review, tenant-default mapping correction, precedence documentation, and approval to proceed to fiscal policy |
| 30.3 | Outlet-scoped fiscal policies, fiscal invoice sequences, monotonic number generation, RLS, permissions, and audit events |
| 30.4 | Deterministic tax calculation engine, inclusive/exclusive support, rule precedence, immutable bill snapshots, RLS, and bill integration |
| 30.5 | Tax summary and detailed reporting from bill/tax snapshots, invoice counts, taxable sales, outlet filtering, and audit events |
| 30.6 | Shared tax Dart contracts, typed API client, Riverpod providers, and admin tax profile/rate/group/mapping/fiscal policy/report screens |
| 31.1 | Outlet-scoped business days, one-open-day enforcement, current-day lookup, optimistic close, forced RLS, permissions, and audit events |
| 31.2 | Operational shift sessions, one-open-session-per-user enforcement, current-session lookup, optimistic close, forced RLS, permissions, and audit events |
| 31.3 | Cash drawers, one-open-drawer-per-shift enforcement, append-only drawer transactions, counted close, forced RLS, permissions, and audit events |

Detailed evidence and validation history remain in `docs/ai/TASK_LOG.md`.

## Implemented Architecture

- Modular NestJS backend with Prisma and PostgreSQL
- Shared-schema multi-tenancy with tenant-aware constraints and forced RLS
- JWT access and rotating refresh authentication
- Tenant roles, granular permissions, and outlet assignments
- Flutter/Flutter Web applications with Riverpod, Dio, and GoRouter
- Shared Dart models and typed API services
- Socket.IO kitchen realtime foundation
- Domain foundations through RBAC, employees, operations, payments, inventory,
  customers, and reports
- Immutable tenant/platform audit events with forced RLS and hash-chain
  integrity
- Tenant-isolated in-app notifications with immutable content, per-recipient
  state, user preferences, audit integration, and shared Flutter clients
- Tenant-isolated provider metadata, outbound message snapshots, delivery
  attempts, provider abstraction contracts, and transactional enqueueing
- Tenant-isolated communication templates with immutable version history,
  strict variable contracts, preview rendering, and audited administration
- SMTP email delivery with secret references, AES-256-GCM recipient protection,
  atomic claims, append-only attempts, safe failure classification, and
  tenant/outlet-scoped message history
- Twilio SMS delivery with protected auth-token references, provider privacy
  controls, E.164 validation, and shared channel-neutral delivery execution
- Twilio WhatsApp template delivery with immutable approved Content SID
  mappings, protected credentials, E.164 channel addressing, and internal
  delivered/read receipt state application
- Firebase push delivery with environment-referenced service-account
  authentication, encrypted tenant/user device tokens, immutable payloads,
  append-only attempts, and automatic invalid-token deactivation
- Verified Twilio and provider-neutral HMAC webhooks with immutable event
  history, replay protection, sanitized metadata, and centralized delivery,
  failure, bounce, complaint, and WhatsApp read-state synchronization
- Tenant-safe provider administration with environment-only secret references,
  optimistic versioning, audit events, typed Dart clients, Riverpod state, and
  an admin Communication Center for dashboard totals, templates, history,
  attempts, and provider configuration
- Tenant/outlet-scoped communication analytics with bounded UTC ranges,
  daily/weekly/monthly trends, terminal success/failure rates, channel delivery
  latency, provider performance, webhook latency, and admin reporting controls
- Platform-managed subscription plans with stable codes, numbered versions,
  draft-only feature editing, immutable activated snapshots, optimistic
  concurrency, lifecycle APIs, and platform audit events
- Tenant subscription aggregates with exact plan-version references, one
  current record per tenant, idempotent and optimistic lifecycle transitions,
  forced RLS, immutable event history, tenant self-read, and platform-only
  mutation
- Tenant feature entitlement evaluation with exact plan-version baselines,
  effective-dated override precedence, subscription eligibility checks,
  fail-closed results, forced RLS, audited mutation, and a reusable NestJS
  guard/decorator contract
- Tenant usage counters with UTC lifetime/daily/monthly periods, immutable
  idempotent operations, atomic consumption, block/warn/allow policies,
  BigInt-safe contracts, forced RLS, and audited reconciliation/overages
- Tenant trial subscriptions with one-trial-per-tenant enforcement,
  time-bound access, immutable lifecycle history, linked subscription status
  updates, due-expiry processing, paid conversion, forced RLS, and audit events
- Subscription administration UI with shared Dart contracts, typed API service,
  Riverpod providers, platform plan management, tenant subscription lifecycle
  actions, entitlement visibility/overrides, usage counter reconciliation, and
  trial management screens
- Promotions discount policy foundation with tenant/outlet-scoped policy CRUD,
  deterministic bill/item/category discount calculation, immutable
  `DiscountApplication` snapshots, forced RLS, append-only protections,
  permission seed entries, and audit events
- Coupon management foundation with tenant/outlet-scoped coupon CRUD,
  uppercase per-tenant code uniqueness, percentage/fixed/free-item/category/item
  coupon types, validity windows, usage-limit fields, read-only validation,
  forced RLS, permission seed entries, and audit events
- Promotion campaign foundation with tenant-scoped campaigns, selected-outlet
  targeting, campaign rules, activation/deactivation, read-only rule
  evaluation, forced RLS, permission seed entries, and audit events
- Discount eligibility engine with a central tenant-aware evaluator for discount
  policies, requested coupons, and active campaign rules, explicit rejection
  reasons, missing-code reporting, item/category context evaluation, and
  `BEST_SINGLE_DISCOUNT` stacking enforcement
- Promotion redemption tracking with tenant-scoped append-only records,
  idempotent writes, coupon total/per-customer usage enforcement, bill/order
  history APIs, forced RLS, and audit events
- Promotions administration UI with shared Dart contracts, typed Dio client,
  Riverpod providers, authorized admin navigation, dashboard counts, discount
  policy and coupon status actions, campaign lifecycle actions, eligibility
  preview, and redemption history
- Tax foundation with tenant-scoped `TaxProfile` records, `TaxType` and
  `TaxMode` classifications, forced RLS, one-active-default enforcement,
  optimistic updates, protected `/tax/profiles` APIs, RBAC seed entries, and
  audit events
- Tax rules and rates with tenant-scoped basis-point `TaxRate` records,
  composable `TaxGroup` definitions, priority-based `TaxRule` records,
  category/item `TaxCategoryMapping` records, effective dating, active mapping
  overlap prevention, protected `/tax/rates`, `/tax/groups`, `/tax/rules`, and
  `/tax/category-mappings` APIs, and audit events
- Tax architecture review and correction with first-class
  `TaxMappingTarget.TENANT_DEFAULT`, explicit future calculation precedence of
  item rule, category rule, then tenant default rule, and an approval report in
  `docs/architecture/tax-architecture-review.md`
- Fiscal policy administration with outlet-scoped `OutletFiscalPolicy`
  records, `FiscalInvoiceSequence` records, fiscal-year/prefix uniqueness,
  atomic monotonic invoice number generation, protected fiscal policy and
  sequence APIs, fiscal policy permissions, forced RLS, and audit events
- Tax calculation engine with outlet fiscal policy context, active/default tax
  profile resolution, item/category/tenant-default rule precedence, integer
  minor-unit calculation, inclusive/exclusive tax support, explainable
  component breakdowns, protected `/tax/calculate` API, immutable
  `TaxCalculationSnapshot` records, and new bill-generation integration
- Tax reporting foundation with protected `/tax/reports/summary` and
  `/tax/reports/detailed` APIs, business-date filtering, outlet filtering,
  invoice counts, taxable sales, tax collected totals, component breakdowns,
  report generation audits, and no historical recalculation from live tax rules
- Tax administration UI with shared Dart tax contracts, typed Dio tax client,
  Riverpod providers, authorized admin navigation, tax profile/rate/group
  administration, tax mapping creation, outlet fiscal policy creation, fiscal
  sequence visibility, and tax report visibility
- Business day foundation with tenant/outlet-scoped `BusinessDay` records,
  one open day per outlet, separate `businessDate`, protected
  `/business-days` lifecycle APIs, forced RLS, closed-day immutability,
  business-day permissions, and open/close audit events
- Shift management foundation with tenant/outlet-scoped `ShiftSession` records,
  one open session per assigned user, current-session lookup, optional staff
  shift-template reference, protected `/shift-sessions` lifecycle APIs, forced
  RLS, closed-session immutability, operational shift permissions, and
  open/close audit events
- Cash drawer foundation with tenant/outlet/business-day/shift-scoped
  `CashDrawer` records, one open drawer per shift session, append-only
  `CashDrawerTransaction` history, opening balance, cash in/out adjustments,
  counted closing balance, protected `/cash-drawers` lifecycle APIs, forced
  RLS, drawer permissions, and audit events

## Known Environment Limitation

Committed migrations after the initial foundation have not been deployed to the
local PostgreSQL instance because recorded local credentials are invalid.
Schema validation and automated tests can run; live database behavior requires
valid credentials and migration deployment.

## Next Task

### Task 31.4 - Shift Closing and Reconciliation

Read:

- `docs/tasks/000-roadmap.md`
- `docs/ai/MODULE_DEPENDENCIES.md`
- `docs/ai/DATABASE_STANDARDS.md`
- `docs/ai/API_STANDARDS.md`

Do not implement Task 31.4 unless explicitly requested. It should build on
Task 31.1 business days, Task 31.2 shift sessions, and Task 31.3 cash drawers
and add shift closing/reconciliation only; business day closing and operations
UI remain later Task 31 subtasks.

## Status Maintenance

Update this file after every substantive task. Keep it short; historical detail
belongs in `TASK_LOG.md`, while future sequencing belongs in
`docs/tasks/000-roadmap.md`.
