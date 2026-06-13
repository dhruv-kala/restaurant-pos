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

Tasks 1 through 27.2 are complete at the foundation level.

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

Task 27.3 is next provisionally: implement Email Delivery Providers.
Do not implement it unless the active user request explicitly asks for it.

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
