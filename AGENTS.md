# Restaurant POS AI Working Agreement

This file is the primary persistent context for AI coding agents working in this
repository. Read it before planning or changing code. Then read:

1. `docs/ai/CURRENT_STATUS.md`
2. `docs/ai/TASK_EXECUTION_RULES.md`
3. The relevant file under `docs/specifications/`

Load concern-specific standards from `docs/ai/` only when relevant. Do not load
the complete `TASK_LOG.md` for routine starts; it is historical evidence.
Use `docs/ai/CODEX_START_PROMPT.md` when starting a new Codex conversation.

## Repository Identity

- The repository root folder name is `restaurant-pos`.
- Do not rename the repository root.
- The product is a multi-tenant Restaurant POS SaaS and broader Restaurant
  Operating System.
- Existing documents and package names may use the working product name
  `ServeIQ`; do not perform a product-wide rename unless explicitly requested.

## Architecture Direction

```text
restaurant-pos/
  apps/
    restaurant-app/
    admin/
    super-admin/
    customer/
  packages/
    core/
    auth/
    api_client/
    shared_models/
    ui_kit/
    analytics/
    common/
  backend/
    api/
    database/
    migrations/
    scripts/
  docs/
    ai/
    architecture/
    api/
    database/
    business-rules/
    specifications/
  infrastructure/
  README.md
```

Some additional reserved or experimental directories may already exist. Do not
delete, rename, or restructure them as incidental work.

## Mandatory Delivery Order

Backend and API contracts come before Flutter screens.

For each feature:

1. Define business rules and domain boundaries.
2. Define database ownership, tenant scope, and invariants.
3. Define API contracts, DTOs, validation, errors, and authorization.
4. Implement and test backend behavior.
5. Add shared client models and API client behavior.
6. Implement Flutter state and screens.

Do not start UI-first feature work when its API and domain contracts are not
defined.

## Technology Decisions

Backend:

- NestJS
- PostgreSQL
- Prisma
- JWT access and rotating refresh tokens
- Socket.IO for kitchen realtime updates
- PM2 later
- Nginx later
- Ubuntu VPS
- PostgreSQL installed directly on the VPS
- No Docker
- No Kubernetes
- No required cloud dependency initially

Frontend:

- Flutter and Flutter Web
- Riverpod
- Dio
- SQLite
- GoRouter

## Non-Negotiable Domain Rules

- Every tenant-owned record must carry tenant scope.
- Tenant context comes from trusted authentication, never directly from an
  untrusted request field.
- Outlet authorization is separate from tenant isolation.
- Backend authorization is authoritative; client role checks are presentation
  behavior only.
- Money uses integer minor units and an ISO currency code.
- Timestamps are stored in UTC; tenant and outlet timezones use IANA names.
- Financial, inventory, loyalty, fiscal, and audit history is append-only.
- Corrections use compensating records instead of rewriting history.
- Offline commands require idempotency and optimistic concurrency.
- Completed orders retain commercial snapshots.

See `docs/database/initial-erd.md` for the broader data baseline.

## Current Work Boundary

Tasks 1 through 32.6 are complete at the foundation level.

Task 11 created the tenant-scoped menu database schema, NestJS category/item
APIs, variants, add-ons, outlet price overrides, shared client contracts, and
the Flutter admin menu application.

Task 14 implemented the Kitchen Display System schema, station routing,
queue projections, item and order kitchen transitions, SLA classification,
authorization, event placeholders, shared client contracts, and restaurant-app
KDS screens.

Task 15 implemented immutable billing snapshots, GST breakdowns, atomic bill
numbering, bill updates, print/reprint auditing, split/merge replacement flows,
void auditing, authorization, shared client contracts, and restaurant-app
billing screens.

Task 16 implemented idempotent payment aggregates, cash/UPI/card and future
tenders, partial and split payments, bill balance reconciliation, append-only
refunds, business-date reporting, authorization, shared client contracts, and
restaurant-app payment screens.

Task 17 implemented immutable receipt and tax-invoice snapshots, outlet/day
numbering, protected APIs, print auditing, PDF/thermal rendering, shared client
contracts, and restaurant-app receipt screens.

Task 18 completed the Kitchen Display System with first-class kitchen stations,
menu-item station assignments, station-aware order-item routing, item actor
auditing, preparation metrics, protected `/kitchen` APIs, tenant/outlet/station
Socket.IO rooms, typed clients, Riverpod providers, and restaurant-app kitchen
queue, station, and analytics screens.

Task 19 implemented tenant-scoped inventory master data, outlet stock balances,
append-only movements, adjustments, transfers, vendors, purchase orders,
receiving, batches, alerts, valuation, shared clients, and admin screens.

Task 20 implemented recipes, production recipes, yield and portion
calculations, cost snapshots, profitability, idempotent order-triggered stock
consumption, immutable wastage, typed clients, and admin workflows.

Task 21 implemented tenant customer profiles, duplicate-safe contact lookup,
addresses, append-only notes and visits, payment-driven stats, customer
history, typed clients, admin workflows, and restaurant customer lookup.

Task 22 implemented business-date report facts, audited and tenant-isolated
sales/GST/payment/outlet/customer/inventory/kitchen/staff reports, dashboard
KPIs, export foundations, shared clients, and admin report screens.

Task 23 implemented user-linked employee profiles, shifts, effective
assignments, attendance, source-derived performance projections, typed clients,
and admin workforce screens.

Task 23.5 implemented platform master-data tables, system settings, application
modules, global role templates, 184 permissions, role mappings, environment-aware
idempotent seed commands, and a complete development demo restaurant dataset.

Task 24 implemented tenant-safe user administration, custom/system role
protection, permission visibility and assignment, multi-outlet access, shared
clients, Riverpod providers, and admin access-management screens.

Task 24.5 created the AI-first documentation framework, split architecture and
engineering standards, module dependency map, concise current status, module
specifications, Task 24-100 roadmap, and reusable prompt template.

Task 25 implemented immutable platform/tenant audit events, hash-chain
integrity, forced RLS, protected query/export APIs, redaction, transactional
authentication/RBAC/report events, shared clients, and an admin explorer.

Task 26 implemented tenant/outlet/user in-app notifications, immutable content,
per-recipient delivery/read state, category preferences, authorized publishing,
audit integration, shared clients, admin UI, and restaurant-app foundations.

Task 27.1 implemented provider-neutral communication persistence, protected
recipient addressing, idempotent transactional enqueueing, adapter contracts,
and delivery-state rules. Templates, provider implementations, webhooks, UI,
and analytics remain deferred.

Task 27.2 implemented tenant-scoped communication templates, immutable version
history, strict placeholder validation and preview rendering, protected CRUD
APIs, exact message version references, permissions, and audit events.

Task 27.3 implemented SMTP email execution, environment-backed secret
references, AES-256-GCM recipient protection, atomic message claims,
append-only attempts, protected history APIs, and delivery audit events.

Task 27.4 implemented Twilio SMS execution, E.164 validation, protected
auth-token references, provider privacy controls, shared delivery
orchestration, append-only attempts, and SMS delivery audit events.

Task 27.5 implemented Twilio WhatsApp approved-template execution, protected
auth-token references, immutable internal template-version to Content SID
mappings, E.164 channel addressing, delivered/read state foundations, and
WhatsApp audit events.

Task 27.6 implemented Firebase Cloud Messaging HTTP v1 delivery,
environment-referenced service-account authentication, encrypted tenant/user
device registrations, immutable push payloads, append-only attempts,
invalid-token deactivation, and push audit events.

Task 27.7 implemented verified Twilio and provider-neutral HMAC webhooks,
immutable tenant-scoped event history, replay protection, delivery status
synchronization, bounce/complaint handling, WhatsApp read tracking, attempt
inspection, and audit events.

Task 27.8 implemented tenant-safe provider administration, environment-only
secret references, shared communication models and clients, Riverpod state,
and the admin Communication Center for dashboard totals, templates, message
history, delivery attempts, and provider configuration.

Task 27.9 implemented tenant/outlet-scoped communication KPIs, bounded UTC
report ranges, daily/weekly/monthly trends, channel and provider performance,
delivery and webhook latency, typed clients, and admin reporting controls.

Task 28.1 implemented the global subscription plan catalog, stable plan codes,
numbered versions, draft feature snapshots, immutable activated versions,
platform-only APIs, optimistic concurrency, and audit events.

Task 28.2 implemented tenant-scoped subscription aggregates, exact plan-version
references, idempotent lifecycle commands, optimistic concurrency, forced RLS,
append-only transition history, platform mutation, tenant self-read, and audit
events.

Task 28.3 implemented tenant-scoped feature overrides, exact plan-version
baseline evaluation, active override precedence, subscription eligibility,
fail-closed access, reusable NestJS guard/decorator enforcement, forced RLS,
optimistic/idempotent administration, and audit events.

Task 28.4 implemented tenant-scoped BigInt usage counters, UTC
lifetime/daily/monthly periods, immutable idempotent operations, atomic
consumption, block/warn/allow over-limit policies, forced RLS, protected
evaluation/reconciliation APIs, and audit events.

Task 28.5 implemented tenant-scoped trial subscriptions, one-trial-per-tenant
enforcement, linked `TRIAL` subscription creation, extension, expiry,
due-expiry processing, paid conversion, immutable trial history, forced RLS,
protected APIs, and audit events.

Task 28.6 implemented shared subscription Dart contracts, typed API clients,
Riverpod state, and the admin Subscription Administration center for plan
management, tenant subscription lifecycle actions, entitlement overrides, usage
reconciliation, and trial management.

Task 29 implemented the promotions module through discount policy foundation,
coupon management, promotion campaigns, eligibility evaluation, redemption and
usage tracking, shared client contracts, and admin promotions UI.

Task 30 implemented tax foundation, tax rules and rates, architecture review
and correction, fiscal policy administration, tax calculation, tax reporting,
shared client contracts, and admin tax UI.

Task 31.1 implemented outlet-scoped business days, one-open-day enforcement,
current-day lookup, optimistic close, forced RLS, permissions, and audit events.

Task 31.2 implemented tenant/outlet-scoped operational shift sessions,
one-open-session-per-user enforcement, current-session lookup, optional staff
shift-template references, protected lifecycle APIs, forced RLS, permissions,
and audit events.

Task 31.3 implemented tenant/outlet/business-day/shift-scoped cash drawers,
one-open-drawer-per-shift enforcement, append-only drawer transactions,
opening balances, cash adjustments, counted close, forced RLS, permissions, and
audit events.

Task 31.4 implemented immutable tenant/outlet/business-day/shift-scoped shift
reconciliations, one reconciliation per shift and drawer, expected/count cash
variance snapshots, required notes for non-zero variance, protected
`/shift-reconciliations` APIs, forced RLS, permissions, shift-close
precondition enforcement, and audit events.

Task 31.5 implemented immutable tenant/outlet/business-day-scoped business day
closings, one closing per business day, close-time validation for active
shifts, active drawers, and unreconciled shifts, expected/count cash summary
snapshots, protected closing summary read API, forced RLS, and audit events.

Task 31.6 implemented shared Dart operation contracts, a typed operations API
client, Riverpod providers, authorized admin navigation, and Operations
administration tabs for business days, shifts, cash drawers, reconciliations,
day closings, and audit history.

Task 32.1 implemented tenant-scoped device registry records, device type/status
enums, unique device identifiers, optional outlet scope for admin workstations,
required outlet scope for operational devices, protected `/devices` APIs,
forced RLS, permission seeds, role mappings, and device audit events.

Task 32.2 implemented tenant-scoped device enrollment records, expiring hashed
activation codes, one active enrollment per device, approval workflow,
activation of approved devices, protected enrollment APIs, forced RLS,
permission seeds, role mappings, and enrollment/activation audit events.

Task 32.3 implemented tenant-scoped trusted session records, one active session
per device/user, one-time plaintext session token return, hashed token
persistence, renewal, revocation, ownership enforcement, protected trusted
session APIs, forced RLS, permission seeds, role mappings, and audit events.

Task 32.4 implemented outlet-scoped terminal records, terminal identity,
per-tenant/outlet terminal-code uniqueness, append-only device assignment
history, one active assignment per terminal and device, same-outlet assignment
enforcement, protected terminal APIs, forced RLS, permission seeds, role
mappings, and audit events.

Task 32.5 implemented tenant/outlet-scoped device security policies, one active
policy per scope, outlet override precedence, trusted-session timeout caps,
device-type restrictions, forced logout before a policy timestamp, protected
policy and effective-policy APIs, forced RLS, permission seeds, role mappings,
and audit events.

Task 32.6 implemented shared Dart device contracts, typed device-management API
clients, Riverpod repository/providers, authorized admin navigation, and admin
device screens for registered devices, enrollments, trusted sessions, terminals,
assignments, security policies, effective policy evaluation, and audit
visibility.

Task 33.1 implemented the offline architecture foundation, storage-neutral
shared Dart contracts for `DeviceSyncState`, offline identifiers, sync queue
items, batches, conflicts, checkpoints, push/pull requests, and architecture/API
documentation. SQLite tables, sync execution, conflict resolution, and offline
POS workflows remain deferred.

Task 33.2 implemented the restaurant-app SQLite local storage foundation with
durable local tables for `DeviceSyncState`, orders, bills, customers, and
inventory projections, tenant/outlet/device scoping, local entity mappers,
repository APIs, and persistence tests across database reopen.

Task 33.3 implemented append-only restaurant-app sync queue and local change
log storage for create, update, and delete operations, transactional queue and
change-log appends, scoped recovery reads, idempotency-key uniqueness, schema
upgrade handling, and persistence tests across database reopen.

Task 33.4 implemented local sync conflict persistence, conflict detection that
marks queue entries as `CONFLICT`, server-wins and client-wins resolution
decisions, manual-review handling, append-only conflict decision history,
financial-record manual-review enforcement, schema version 3 upgrade handling,
and conflict resolution tests.

Task 33.5 implemented the restaurant-app background sync service foundation
with retryable queue claiming, bounded exponential retry policy, push transport
abstraction, batch history, checkpoint tracking, queue success/retry/failure
transitions, conflict recording integration, device sync counters, schema
version 4 upgrade handling, and worker tests.

Task 33.6 implemented offline POS operation foundations for orders, bills,
payments, and receipts with local payment/receipt projections, schema version 5
upgrade handling, atomic local projection plus queued-command writes, offline
order creation/status updates, bill generation, manual payment recording,
receipt generation, bill paid-state updates, and offline POS workflow tests.

Task 33.7 implemented offline customer and inventory operation foundations with
scoped local lookup helpers, customer create/update commands, inventory
adjustment commands, atomic projection plus queued-command writes, and workflow
tests.

Task 33.8 implemented sync monitoring and recovery foundations with queue state
counts, failed/retrying/stale in-progress visibility, open conflict visibility,
recent batch and checkpoint visibility, failed-item retry recovery, stale
in-progress recovery, and tests.

Task 33.9 is next provisionally: implement offline administration UI. Do
not implement it unless the active user request explicitly asks for it.

## Working Practices

- Inspect the current worktree before editing; it may contain uncommitted user
  work.
- Never revert unrelated changes.
- Keep changes scoped to the active task.
- Prefer existing repository conventions over introducing new patterns.
- Update documentation when an architecture or contract decision changes.
- Update `docs/ai/TASK_LOG.md` at the end of substantive work.
- Record facts as completed only after verifying the files and relevant checks.
- Do not commit secrets, `.env` files, credentials, or production connection
  strings.

## Validation Baseline

Use checks relevant to the changed area.

Backend, from `backend/api`:

```powershell
npm run lint
npm run build
npm run test
npm run test:e2e
npm run prisma:validate
```

Flutter, from the relevant app or repository workspace:

```powershell
flutter pub get
flutter analyze
flutter test
```

Do not claim validation succeeded unless it was actually run. If an external
service such as PostgreSQL is unavailable, report that limitation clearly.
