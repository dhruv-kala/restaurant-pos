# AI Task Log

Last updated: 2026-06-12

## Status Legend

- `COMPLETE`: Required foundation exists and was verified in the repository.
- `IN PROGRESS`: Work has started but the task is not complete.
- `NEXT`: Approved next task; no implementation has started.
- `PLANNED`: Known future work.

## Current Summary

Tasks 1 through 27.1 are complete at the requested foundation level.

The worktree contains uncommitted project changes. Future agents must inspect and
preserve them rather than assuming a clean checkout.

Task 27.2, Communication Template Management, is the next provisional roadmap
item. It is not approved for implementation until explicitly requested.

## Task History

| Task | Status | Result |
|---|---|---|
| 1. Repository layout analysis and restructuring | COMPLETE | Monorepo direction established under `apps`, `packages`, `backend`, `docs`, and `infrastructure`. |
| 2. Create system overview | COMPLETE | `docs/architecture/system-overview.md` exists and records product, application, tenancy, offline, security, deployment, and scaling direction. |
| 3. Create initial ERD | COMPLETE | `docs/database/initial-erd.md` exists and defines the initial multi-tenant relational baseline and migration sequence. |
| 4. Create NestJS base project | COMPLETE | `backend/api` contains the NestJS foundation, configuration, health endpoint, Swagger setup, tests, and module scaffolds. |
| 5. Configure PostgreSQL and Prisma | COMPLETE | Prisma dependencies, datasource, client generator, environment contract, commands, and database-aware health behavior were established before domain modeling began. |
| 6. Create tenant, outlet, user, role, and permission schema | COMPLETE | Prisma models, initial migration, tenant-aware constraints, forced RLS, permission seed, tests, and database documentation are implemented. |
| 7. Implement authentication with access and refresh tokens | COMPLETE | Login, refresh rotation, logout revocation, bearer `/auth/me`, bcrypt credentials, hashed refresh persistence, Swagger, tests, seed, and documentation are implemented. |
| 8. Implement tenant and outlet module | COMPLETE | Protected tenant/outlet APIs, role boundaries, pagination, RLS request context, schema fields, migration, tests, and outlet-limit enforcement are implemented. |
| 9. Create Flutter shared packages | COMPLETE | Standardized seven workspace packages, backend-aligned shared models, Dio auth/tenant/outlet services, auth contracts, UI primitives, analytics, utilities, and frontend architecture documentation are implemented. |
| 10. Implement Flutter login and role-based navigation | COMPLETE | Secure token storage, Riverpod auth state/providers, NestJS auth repository, splash restore, guarded GoRouter role navigation, refresh/retry, logout, and seven role dashboard placeholders are implemented. |
| 11. Implement Menu Management Module | COMPLETE | Tenant-scoped menu schema, forced RLS, category/item/variant/add-on APIs, outlet pricing, shared clients, Riverpod admin screens, tests, and documentation are implemented. |
| 12. Implement Table Management Module | COMPLETE | Outlet-scoped sections, dining tables, statuses, reservations, merge/split/transfer operations, shared clients, Riverpod admin screens, tests, and documentation are implemented. |
| 13. Implement Order Management Module | COMPLETE | Tenant/outlet-scoped orders, immutable item pricing snapshots, lifecycle, transfer, kitchen queue, typed clients, Riverpod state, restaurant-app screens, tests, and documentation are implemented. |
| 14. Implement Kitchen Display System Module | COMPLETE | Tenant/outlet kitchen routing, queue projections, item and order kitchen transitions, SLA states, authorization, typed clients, Riverpod KDS screens, tests, and documentation are implemented. |
| 15. Implement Billing Module | COMPLETE | Immutable bill snapshots, GST/tax breakdowns, atomic numbering, audited lifecycle, split/merge, typed clients, Riverpod screens, tests, and documentation are implemented. |
| 16. Implement Payment Module | COMPLETE | Idempotent payment aggregates, tender transactions, partial/split payments, refunds, bill reconciliation, typed clients, Riverpod screens, tests, and documentation are implemented. |
| 17. Implement Receipt & Invoice Module | COMPLETE | Immutable receipt and tax-invoice snapshots, numbering, PDF/thermal rendering, print audit, protected APIs, shared clients, and Flutter screens are implemented. |
| 18. Complete Kitchen Display System | COMPLETE | First-class stations, station routing, item actor audits, preparation metrics, authenticated Socket.IO events, typed clients, Riverpod providers, and KDS screens are implemented. |
| 19. Implement Inventory Module | COMPLETE | Tenant inventory masters, outlet balances, append-only movements, adjustments, transfers, purchasing, batches, alerts, valuation, typed clients, and admin screens are implemented. |
| 20. Implement Recipe & Stock Consumption Engine | COMPLETE | Recipes, production recipes, costing, profitability, idempotent order consumption, wastage, typed clients, and admin screens are implemented. |
| 21. Implement Customer Management Module | COMPLETE | Customer profiles, duplicate-safe lookup, addresses, notes, payment visits, stats/history, typed clients, admin screens, and restaurant lookup are implemented. |
| 22. Implement Reports Module | COMPLETE | Business-date reports, dashboard KPIs, tenant/outlet authorization, audit history, export foundation, shared clients, Riverpod providers, admin screens, tests, and documentation are implemented. |
| 23. Implement Employee & Staff Management Module | COMPLETE | User-linked profiles, shifts, assignments, attendance, performance projections, events, shared clients, Riverpod providers, admin screens, tests, and documentation are implemented. |
| 23.5. Implement Master Data & Database Seed Framework | COMPLETE | Global locale/settings/module/role-template masters, 184 permissions, role mappings, environment-aware idempotent seeds, and a complete development demo restaurant dataset are implemented. |
| 24. Implement RBAC & User Management Module | COMPLETE | Tenant-safe user provisioning, lifecycle controls, roles, granular permissions, outlet access, effective JWT permissions, shared clients, Riverpod providers, admin screens, tests, and documentation are implemented. |
| 24.5. AI Development Optimization Framework | COMPLETE | Concern-specific AI standards, concise status, dependency map, module specifications, Task 24-100 roadmap, prompt template, and optimized restart instructions are implemented. |
| 25. Implement Audit & Activity Logging Module | COMPLETE | Immutable tenant/platform events, per-scope hash chains, forced RLS, protected APIs, transactional security integrations, typed clients, Riverpod providers, admin explorer, tests, and documentation are implemented. |
| 26. Implement Notification Center Module | COMPLETE | Tenant/outlet/user in-app notifications, recipient delivery/read state, preferences, publishing APIs, shared clients, admin center, and restaurant-app foundation are implemented. |
| 27.1. Communication Infrastructure Foundation | COMPLETE | Provider/message/attempt schema, protected recipient addressing, immutable communication history, idempotent enqueueing, abstraction contracts, and state rules are implemented. |

## Task 27.1 Completion

Completed on 2026-06-13.

Implemented:

- Communication channel, provider, recipient, message, and attempt lifecycle
  enums
- Tenant-scoped `CommunicationProvider`, `CommunicationMessage`, and
  `CommunicationAttempt` Prisma models
- Migration `20260614020000_add_communication_foundation` with composite tenant
  foreign keys, integrity checks, queue/retry/history indexes, forced RLS, and
  immutable history triggers
- Ciphertext, SHA-256 lookup hash, and masked recipient-address persistence
- Secret-reference-only provider configuration contract
- Tenant/channel idempotency keys bound to deterministic request fingerprints
- Internal `CommunicationService.enqueue` for atomic use inside an existing
  Prisma business transaction
- Communication-owned sensitive metadata sanitization before message
  persistence
- Provider-neutral adapter request/result interfaces
- Explicit message and delivery-attempt transition rules
- Schema, state-transition, and enqueue/idempotency tests
- Communication architecture, database, specification, and task documentation

Decisions:

- Task 27.1 exposes no HTTP endpoints and makes no external network calls.
- Business modules enqueue durable communication snapshots in their own
  transaction; they never call providers directly.
- Templates, concrete providers, delivery workers, webhooks, Flutter UI,
  analytics, and communication permissions remain in their assigned Task 27.x
  subtasks.
- General transactional outbox and background-job infrastructure remains Task
  34; Task 27.1 does not introduce Redis, a broker, or cloud queues.
- Plaintext recipient addresses are allowed only transiently at a future
  authorized provider adapter boundary.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run prisma:migrate:deploy`: failed with a Prisma schema-engine error
  before migration deployment
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 169 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- Focused communication tests: passed, 10 tests
- `git diff --check`: passed

Known limitations:

- The migration was not deployed because the configured local PostgreSQL
  datasource returned a Prisma schema-engine error.
- No communication provider is registered and no delivery worker runs in Task
  27.1.
- Recipient address encryption/decryption implementation is intentionally
  deferred to the authorized provider boundary; Task 27.1 requires callers to
  supply ciphertext, a hash, and a masked value.

Corrections on 2026-06-13:

- Removed out-of-scope `CommunicationTemplate`,
  `CommunicationTemplateVersion`, and `CommunicationWebhook` schema and
  migration contracts.
- Removed template references from messages and enqueue service contracts.
- Removed premature communication permission seeds.
- Replaced the Audit module redaction dependency with a communication-local
  metadata sanitizer.

## Task 26 Completion

Completed on 2026-06-12.

Implemented:

- `Notification`, `NotificationRecipient`, and `NotificationPreference` Prisma
  models with category, priority, audience, delivery, read, archive, expiry,
  mandatory, and immutable content contracts
- Migration `20260613220000_add_notification_center` with tenant-aware foreign
  keys, forced RLS, integrity checks, indexes, and immutable content/delete
  triggers
- Active membership expansion for tenant, outlet, and direct-user audiences
- Preference-aware in-app delivery with mandatory notice bypass
- Self-service inbox, unread count, detail, mark-read, mark-all-read, and
  preference APIs
- Authorized administration create/list/detail APIs with platform, tenant,
  manager-outlet, and granular permission boundaries
- Audit events for notification publishing and preference changes
- Notification permission seeds with publishing restricted to administrative
  roles
- Shared Dart notification models and typed Dio API service
- Admin inbox, publishing history, and compose UI
- Restaurant-app notification repository/providers, unread badge, inbox,
  detail, and read-state foundation
- API, database, and module specification documentation

Decisions:

- Task 26 is in-app only. Email, SMS, WhatsApp, push, templates, providers,
  webhooks, retries, and worker/outbox delivery belong to Task 27 Communication.
- Notification content is immutable; per-recipient delivery and read state is
  mutable.
- Disabled preferences create `SKIPPED` recipient rows for delivery accounting.
- Managers cannot publish tenant-wide notices and are locked to their
  authenticated outlet.
- Task 27 Communication replaces the prior provisional Task 27 loyalty slot by
  explicit product direction; loyalty remains future work.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 159 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- Focused notification tests: passed, 7 tests
- `flutter pub get` for admin and restaurant-app: passed
- `dart analyze` for shared models and API client: passed
- `flutter analyze` for admin and restaurant-app: passed
- `flutter test` for admin: passed, 1 test
- `flutter test` for restaurant-app: passed, 9 tests
- `git diff --check`: passed

Known limitations:

- The migration was not deployed because project history records invalid local
  PostgreSQL credentials.
- Task 26 does not send email, SMS, WhatsApp, or push notifications. Those
  provider channels, templates, retries, webhooks, and workers are intentionally
  deferred to Task 27.
- Existing business modules are not automatically emitting notification
  records; each future integration must define its event, idempotency, audience,
  and transaction boundary.

## Task 25 Completion

Completed on 2026-06-12.

Implemented:

- Immutable `AuditEvent` model with global sequence, tenant/platform scope,
  outlet scope, actor/effective actor/impersonator context, action taxonomy,
  target, result, reason, redacted changes, request metadata, and correlation
  fields
- Per-platform and per-tenant SHA-256 hash chains serialized with PostgreSQL
  transaction advisory locks
- Database constraints, indexes, forced RLS, and triggers rejecting audit row
  updates and deletes
- Migration `20260613180000_add_audit_activity_logging`
- Credential, token, authorization, and payment-secret redaction utility
- Protected audit list, detail, and export-request APIs with tenant, outlet,
  actor, action, target, result, date, correlation, search, and pagination
  filters
- Super-admin, tenant-admin, permission-based, and manager-outlet access
  boundaries
- Audit events for audit reads and export requests
- Transactional login, refresh, logout, user administration, role,
  role-permission, user-role, user-outlet, report generation, and report export
  events
- Shared Dart audit models and typed `AuditApiService`
- Riverpod audit repository/providers and admin event explorer/detail screens
- Super-admin audit integration foundation
- API, database, and module specification documentation

Decisions:

- Audit chains are independent per tenant and for platform events, avoiding
  cross-tenant chain contention while preserving ordered integrity.
- Mandatory integrated events are appended in the same transaction as the
  security or business change.
- Audit access and export are auditable.
- Export rendering and delivery remain deferred; Task 25 records the immutable
  request.
- Existing domain-specific immutable fields and ledgers remain authoritative;
  the audit module records actor/action context rather than duplicating domain
  state.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:generate`: passed
- `npm run prisma:validate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 152 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter analyze` for admin: passed
- `flutter test` for admin: passed
- `flutter build web` for admin: passed
- `git diff --check`: passed

Known limitations:

- The migration was not deployed because project history records invalid local
  PostgreSQL credentials.
- Historical actions completed before this migration are not backfilled.
- Comprehensive denied/failed request interception, retention execution, SIEM
  export, and asynchronous export file delivery remain future work.
- Remaining operational modules can adopt the shared transactional append
  service incrementally as their privileged action contracts are revised.

## Task 24.5 Completion

Completed on 2026-06-12.

Implemented:

- Split AI references for architecture, technology stack, coding, database,
  API, Flutter, security, and multi-tenancy standards
- Complete module dependency and ownership map
- Minimal-read task execution rules that avoid routine full-repository analysis
- Concise `CURRENT_STATUS.md` for restart context without loading historical
  task evidence
- Reusable short and detailed prompt templates
- Audit, notification, and loyalty module specifications
- Specification index preserving existing implemented module contracts
- Provisional Task 24 through Task 100 roadmap with completed, next, and planned
  statuses
- Updated `AGENTS.md`, project context, development rules, and Codex restart
  prompt to use the optimized documentation structure

Decisions:

- `TASK_LOG.md` remains the detailed historical evidence store but is no longer
  part of the default routine read set.
- `CURRENT_STATUS.md` is the short authoritative status handoff and must be
  updated after every substantive task.
- Unapproved roadmap entries after Task 25 are provisional planning slots and
  do not authorize implementation.
- Future prompts should reference repository documents rather than repeat
  architecture, stack, folder, security, tenancy, and generic output rules.
- A typical 1,500-2,000-line repeated prompt should shrink to 10-30
  task-specific lines, an estimated 70-90% reduction in prompt tokens.

Validation:

- Required AI documentation file presence: passed
- Required module specification file presence: passed
- Task roadmap includes Task 24 through Task 100: passed
- AI status and next-task consistency checks: passed
- Markdown path/link target checks: passed
- `git diff --check`: passed

Known limitations:

- Token reduction is an estimate and varies with task-specific acceptance
  criteria and the amount of code inspection required.
- The roadmap after Task 25 is intentionally provisional and must not override
  explicit future product decisions.

## Task 24 Completion

Completed on 2026-06-12.

Implemented:

- Tenant-scoped user creation, invitation, listing, search, details, updates,
  activation/deactivation, and secure password-reset initiation
- Role CRUD with protected system roles, active state, descriptions, and
  safeguards against deleting assigned custom roles
- Global granular permission catalog with module grouping and role-permission
  replacement APIs
- User-role and user-outlet assignment APIs with tenant-aware validation
- Super-admin, tenant-admin, and outlet-manager access boundaries using trusted
  authentication scope
- Effective permission flattening into authenticated-user and JWT contracts
  while preserving backend authorization as authoritative
- Prisma schema changes and migration
  `20260613140000_add_rbac_user_management`
- Shared Dart RBAC models and typed `RbacApiService`
- Riverpod repositories and providers for users, roles, permissions, access,
  and dashboard metrics
- Admin user dashboard, directory, add/edit/details, role management,
  permission matrix, user-role assignment, and outlet-access screens
- Super-admin RBAC foundation notes and API, database, and specification
  documentation
- UUID validation compatible with the repository's UUIDv7 identifiers

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:generate`: passed
- `npm run prisma:validate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 146 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models, API client, and auth: passed
- `flutter pub get` for admin: passed
- `flutter analyze` for admin: passed
- `flutter test` for admin: passed, 1 test
- `flutter build web` for admin: passed

Known limitations:

- Migration `20260613140000_add_rbac_user_management` was not deployed because
  project history records invalid local PostgreSQL credentials.
- Invitation delivery is represented by secure account provisioning; outbound
  email and one-time invitation-token delivery remain future infrastructure.
- Password reset stores a new random hash without returning or logging the
  secret. A user-facing reset-token delivery flow remains future work.
- The super-admin application records the platform RBAC integration boundary;
  full platform UI composition remains a later super-admin task.

## Task 23.5 Completion

Completed on 2026-06-12.

Implemented:

- Global country, currency, language, timezone, application-module,
  system-setting, role-template, and template-permission tables
- Migration `20260613100000_add_master_data_seed_framework`
- 10 countries, 8 currencies, 8 languages, 8 timezones, 9 system role
  templates, 184 granular permissions, and role-permission mappings
- Published order, payment, inventory, kitchen, customer, business-date,
  currency, timezone, tax, receipt, and loyalty settings
- Numbered `001` through `020` transactional seed stages
- Environment-aware `seed`, `seed:master`, and `seed:demo` commands
- Production hard block for demo data and explicit staging opt-in
- Demo Restaurant, Main Branch, five kitchen stations, seven users, tenant
  roles and grants, memberships, and outlet assignments
- 20 tables, four menu categories, seven menu items, station routing, eight
  stocked ingredients, five recipes, and 20 customers with varied visit history
- Master-data, seeding-strategy, and demo-data documentation

Validation:

- `npm.cmd run prisma:format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npx.cmd tsc -p prisma/tsconfig.seed.json`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 134 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- Production `npm.cmd run seed:demo`: correctly rejected before database access
- `git diff --check`: passed
- `npm.cmd run seed`, `npm.cmd run seed:master`, and `npm.cmd run seed:demo`
  reached Prisma but failed with PostgreSQL `P1000` authentication errors

Known limitation:

- Existing project history records invalid local PostgreSQL credentials.
  Database-backed seed execution requires a reachable database with all
  committed migrations deployed. Runtime duplicate and foreign-key verification
  could not be completed against the unavailable database; schema validation,
  deterministic keys, transactional execution, and seed contract tests passed.

## Task 23 Completion

Completed on 2026-06-12.

Implemented:

- Employee profiles extending existing global `UserAccount` identities and
  validating active tenant membership, selected role, and outlet assignment
- Tenant-local employee codes, role/designation/department/employment data,
  salary minor units, manager hierarchy, emergency contacts, language,
  status, profile audit actors, versioning, and soft termination
- Outlet shifts with wall-clock times, breaks, night-shift state, activation,
  and effective-dated non-overlapping employee assignments
- One attendance record per employee/day with business date, check-in/out,
  worked minutes, status, remarks, device, captured location, and recording
  actor
- Daily employee performance projections for waiter, cashier, kitchen, and
  manager metrics, including enhanced tips, discounts, refunds, preparation,
  delays, and rating foundations
- Automatic performance refreshes from completed orders, successful/refunded
  payments, and kitchen-ready transitions, plus report-time recovery rebuilds
- Protected employee CRUD/directory/dashboard, shift CRUD/assignment,
  attendance check-in/out/history, employee performance, and performance report
  endpoints
- Super-admin, tenant-admin, manager, HR-manager, and employee-own access
  boundaries with trusted tenant/outlet scope and forced RLS
- Typed `EmployeeCreated`, `ShiftAssigned`, `AttendanceCheckedIn`,
  `AttendanceCheckedOut`, and `PerformanceUpdated` event placeholders
- Shared Dart employee, shift, attendance, performance, enum, and dashboard
  models with typed `EmployeesApiService`
- Riverpod employee list/detail, shifts, attendance, performance, and dashboard
  providers
- Admin employee dashboard, directory, details, add/edit, shifts, attendance,
  and performance screens
- Employee API, ERD/schema, attendance, shift, performance, identity boundary,
  security, and future payroll documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 131 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get` for admin: passed
- `flutter analyze` for admin: passed
- `flutter test` for admin: passed, 1 test
- `flutter build web` for admin: passed
- `git diff --check`: passed

Known limitations:

- Migration `20260613060000_add_employee_staff_management` was not deployed
  because project history records invalid local PostgreSQL credentials.
- Task 23 requires an existing active user membership, role assignment, and
  outlet assignment. User invitation/provisioning and RBAC administration are
  intentionally Task 24.
- Business date retains the existing UTC calendar-day rule until shift cutoff
  policy is centralized.
- Payroll, leave approval, incentives, tip allocation, biometric verification,
  ratings, and Socket.IO delivery remain future work.

## Task 22 Completion

Completed on 2026-06-12.

Implemented:

- Stored business dates on orders, bills, customer visits, inventory
  consumption, and inventory wastage, with timezone/link-aware migration
  backfills
- Reporting indexes for tenant, business date, outlet, status, customer, and
  inventory aggregation paths
- Append-only report generation audits with filters, report type, export
  format, generator, scope, timestamp, and forced RLS
- Sales, GST, payment, outlet, customer, inventory, kitchen, staff, platform,
  and dashboard report APIs
- `PDF`, `EXCEL`, and `CSV` export request validation and audited foundation
  without prematurely adding a renderer or storage dependency
- Role and trusted tenant/outlet scope enforcement, including waiter-own and
  kitchen-only performance boundaries
- Shared Dart report models, chart-neutral series points, typed API service,
  Riverpod providers, and nine admin report screens
- API catalog, reporting architecture, business-date, security, dashboard, and
  future BI documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 117 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get` for admin: passed
- `flutter analyze` for admin: passed
- `flutter test` for admin: passed, 1 test
- `flutter build web` for admin: passed
- `git diff --check`: passed

Known limitations:

- Migration `20260613020000_add_reports_analytics` was not deployed because
  existing project history records invalid local PostgreSQL credentials.
- Runtime business-date creation retains the existing UTC calendar-day rule;
  Task 23 or a later shift task must centralize outlet cutoff/open-shift rules.
- Export rendering, storage, asynchronous delivery, scheduled reports,
  materialized fact views, and a custom report builder remain future work.
- Item profitability uses current menu cost when a historical cost snapshot is
  unavailable; financial sales and tax amounts remain immutable snapshots.

## Task 21 Completion

Completed on 2026-06-12.

Implemented:

- Tenant-scoped customer profiles with customer type, status, source, personal
  dates, GST number, notes, versioning, and soft deletion
- SMS, email, and WhatsApp consent fields defaulting to opt-out
- Normalized tenant-local phone uniqueness and case-insensitive email
  uniqueness with explicit duplicate conflicts
- Customer addresses with coordinate validation and one live default address
- Append-only operational customer notes with actor/time audit
- Immutable payment-linked customer visits with outlet, order, bill, payment,
  date, and minor-unit spend snapshots
- Rebuilt customer stats for distinct orders, spend, average order value,
  first/last visit, and favorite outlet
- Payment completion integration for immediate and asynchronous successful
  payments with idempotent visit recording
- Tenant-aware `Order.customerId` foreign key and blocked/cross-tenant customer
  validation during order create/update
- Protected customer CRUD, search, dashboard, addresses, notes, orders, bills,
  payments, visits, and stats APIs
- Platform, tenant admin, manager, cashier, waiter-limited, kitchen-denied, and
  future-customer-self-service authorization boundaries
- Shared Dart customer models and typed `CustomersApiService`
- Riverpod customer list, detail, search, dashboard, and stats providers
- Admin dashboard, list, details, add/edit, address, notes, visit history, and
  order history screens
- Restaurant-app phone/name customer lookup integrated into delivery order
  creation
- API, schema/ERD, duplicate, visit, stats, and privacy documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 106 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get` for admin and restaurant-app: passed
- `flutter analyze` for admin and restaurant-app: passed
- `flutter test` for admin: passed, 1 test
- `flutter test` for restaurant-app: passed, 9 tests
- `flutter build web` for admin: passed
- `git diff --check`: passed

Known limitations:

- The migration was not deployed because existing project history records
  invalid local PostgreSQL credentials.
- Customer self-profile ownership, merge/deduplication, marketing campaigns,
  loyalty, wallet, referrals, and consent audit history require later tasks.
- Refunds do not rewrite immutable visit spend; a future compensating customer
  value event is required for net-spend analytics.

## Task 20 Completion

Completed on 2026-06-12.

Implemented:

- Tenant-scoped menu-item and variant recipes with yield, portion, wastage,
  audit, version, and soft-delete fields
- Production recipes for semi-finished goods and optional output ingredients
- Unit normalization and duplicate-composition validation
- Purchase-weighted average recipe costing with master-cost fallback and
  immutable changed-cost snapshots
- Menu and outlet-price profitability calculations
- Configurable outlet consumption trigger at `READY` or `COMPLETED`
- Transactional recipe lookup, stock row locking, stock deduction, immutable
  consumption history, and append-only `CONSUMPTION` stock transactions
- Order-item/ingredient uniqueness for retry-safe idempotency
- Outlet negative-stock policy with conflict behavior and inventory alerts
- Immutable wastage with reason, actor, cost, stock movement, and damaged stock
- Typed `RecipeUpdated`, `InventoryConsumed`, `RecipeCostChanged`, and
  `InventoryShortageDetected` event boundaries without Socket.IO transport
- Protected recipe, production, costing, profitability, consumption, and
  wastage endpoints
- Shared Dart models, typed `RecipesApiService`, Riverpod providers, and admin
  recipe dashboard, list, builder, costing, profitability, consumption, and
  wastage screens
- API, database/ERD, calculation, consumption, costing, and profitability docs

Validation:

- `dart format packages/shared_models/lib packages/api_client/lib apps/admin/lib`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run build`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test -- --runInBand`: passed, 95 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get` for admin: passed
- `flutter analyze` for admin: passed
- `flutter test` for admin: passed, 1 test
- `flutter build web` for admin: passed
- `git diff --check`: passed

Known limitations:

- The migration was not deployed because existing project history records
  invalid local PostgreSQL credentials.
- Production batch execution and finished-goods stock conversion require a
  later task.
- Consumption reversal requires an explicit compensating workflow in a later
  task.
- Costing does not yet implement FIFO or batch depletion.
- Durable event transport and Socket.IO publication remain deferred.
- The built admin web artifact could not be smoke-tested in the in-app browser
  because local `file://` navigation is blocked in this environment.

## Task 19 Completion

Completed on 2026-06-12.

Implemented:

- Prisma inventory category, unit, ingredient, stock, batch, transaction,
  vendor, purchase order, PO item, counter, and alert models
- Fixed-precision quantities, integer minor-unit costs, tenant-aware composite
  keys, balance checks, unresolved-alert uniqueness, and forced RLS
- Migration `20260612170000_add_inventory_management`
- Inventory category and unit configuration endpoints
- Ingredient create/list/detail/update/archive endpoints
- Outlet stock list/detail, adjustment, transfer, and valuation endpoints
- Signed append-only adjustment and paired transfer transactions
- Same-tenant transfer validation, row locking, and sufficient-stock checks
- Vendor create/list/update endpoints
- Atomic outlet/day purchase-order numbering and audited lifecycle
- Transactional PO receipt that increments stock and appends purchase movements
- Low-stock, out-of-stock, negative-stock, and expiry-warning alert foundation
- Explicit alert resolution with user/time audit
- Typed future `StockAdjusted`, `StockTransferred`,
  `PurchaseOrderReceived`, and `InventoryAlertCreated` event boundaries
- Shared Dart inventory models and typed `InventoryApiService`
- Riverpod ingredient, stock, vendor, purchase-order, alert, and valuation
  providers
- Admin inventory dashboard, ingredient list/details, adjustment, transfer,
  vendor, purchase order, alerts, and valuation screens
- API, database, ERD, workflow, and module documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 83 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get`: passed
- `flutter analyze` for admin: passed
- `flutter test` for admin: passed, 1 test
- `flutter build web` for admin: passed
- `git diff --check`: passed

Known limitations:

- The migration was not deployed because existing project history records
  invalid local PostgreSQL credentials.
- Recipe-based automatic stock consumption is intentionally deferred to Task 20.
- Purchase receiving is whole-order only; partial receipts and supplier invoice
  matching require a later procurement contract.
- Valuation uses current ingredient cost. FIFO, weighted-average, landed-cost,
  and batch depletion policies are deferred.
- The built admin web artifact could not be smoke-tested in the in-app browser
  because its runtime was denied access to the local application-data path.

## Task 18 Completion

Completed on 2026-06-11.

Implemented:

- Prisma `KitchenStation` and `KitchenStationAssignment` tenant/outlet models
- `URGENT` order priority and station, timestamp, actor, and preparation fields
  on order items
- Deterministic primary-station snapshots from active menu-item assignments
- Migration `20260612130000_complete_kitchen_display_system` with forced RLS,
  tenant-aware constraints, and queue indexes
- Protected station CRUD, queue, metrics, item-status, and order-status APIs
- Kitchen read, write, and configuration role boundaries with outlet scope
- Item and bulk-order transition actor auditing, including the legacy `/kds`
  compatibility endpoints
- Preparation elapsed/remaining timers, SLA states, and operational metrics
- Authenticated Socket.IO `/kitchen` namespace with tenant, outlet, and station
  rooms
- `KitchenQueueUpdated`, `OrderCreated`, `OrderUpdated`, `OrderReady`,
  `OrderServed`, `ItemReady`, and `ItemServed` events
- Shared station, queue, priority, and metrics models
- Typed kitchen HTTP and Socket.IO clients
- Riverpod station, queue, metrics, and realtime refresh providers
- Restaurant-app kitchen dashboard, queue, station, and analytics screens
- API, database, and feature specification documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 77 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get`: passed
- `flutter analyze` for restaurant-app: passed
- `flutter test` for restaurant-app: passed, 9 tests
- `git diff --check`: passed

Known limitations:

- The migration was not deployed to PostgreSQL because prior tasks recorded
  invalid local database credentials.
- Multiple station assignments are supported in menu configuration, while each
  order item snapshots one deterministic primary station. Fan-out tickets to
  multiple simultaneous stations remain a future explicit workflow.
- The legacy category-based `/kds` API remains for compatibility; new clients
  use the first-class `/kitchen` API.

## Task 17 Completion

Completed on 2026-06-11.

Implemented:

- Prisma `Receipt`, `ReceiptPrintLog`, `ReceiptNumberCounter`, and
  `InvoiceNumberCounter` models with receipt, status, and printer enums
- Outlet/day `REC-YYYYMMDD-00001` and `INV-YYYYMMDD-00001` numbering
- Immutable JSONB printable snapshots for outlet, customer, bill, items, GST,
  payments, totals, footer, and QR verification data
- Paid-bill validation, idempotent customer receipt/tax invoice generation, and
  optional representative payment linking
- Receipt list, invoice list, detail, print, reprint, and streamed PDF endpoints
- Append-only printer/user/copies/time audit with aggregate print counters
- Platform, tenant, outlet, cashier, waiter-read-only, and kitchen-denied access
- PDFKit A4 output and 58mm/80mm thermal layout generation
- Shared receipt, item, tax, payment, print-log, and printable models
- Typed `ReceiptsApiService`, Riverpod providers, repository, and mock printer
  abstraction
- Receipt history, receipt detail, invoice preview, and print screens
- Customer receipt and tax invoice actions from successful payment detail
- API, schema/ERD, layout, PDF, workflow, and module documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 74 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter analyze` for restaurant-app: passed
- `flutter test` for restaurant-app: passed, 9 tests
- `git diff --check`: passed

Known limitations:

- The migration was not deployed to PostgreSQL because prior tasks recorded
  invalid local database credentials.
- Flutter printer discovery and transport are mock implementations; Bluetooth,
  USB, and network adapters remain future hardware work.
- PDF output renders the verification payload with a QR placeholder. A public
  verification endpoint and QR image encoder remain future work.
- Outlet GST number and website fields do not yet exist, so those template
  values remain null until tenant fiscal settings are modeled.
- Email and digital receipt delivery are intentionally deferred.

## Task 16 Completion

Completed on 2026-06-11.

Implemented:

- Prisma `PaymentNumberCounter`, `Payment`, `PaymentTransaction`, and
  `PaymentRefund` models
- Payment method, payment status, refund status, payment source, and bill
  payment status enums
- Atomic outlet/business-day numbering in `PAY-YYYYMMDD-00001` format
- Required create/split/refund idempotency keys and database uniqueness
- Tenant/outlet composite ownership, forced RLS, cash/change, amount, card,
  audit, and refund constraints
- Migration `20260612070000_add_payment_module`
- Cash, UPI, card, wallet, gift-card, and bank-transfer tender contracts
- Partial payments and arbitrary mixed split tenders
- Transactional bill row locking and paid/refunded/outstanding reconciliation
- Append-only idempotent refunds with compensation records
- Payment list, detail, status update, split, and refund endpoints
- Business date, device, terminal, shift, source, and gateway readiness fields
- Platform, tenant, manager, cashier, waiter read-only, and kitchen-denied
  authorization
- Typed payment lifecycle event placeholders
- Shared Dart payment, transaction, refund, method, status, source, and bill
  payment-status models
- Typed `PaymentsApiService` and Riverpod payment providers
- Restaurant-app payment, split payment, refund, history, and detail screens
- API, database, split, partial, refund, status, business-date, and role
  documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 70 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get` for restaurant-app: passed
- `flutter analyze` for restaurant-app: passed
- `flutter test` for restaurant-app: passed, 9 tests
- `git diff --check`: passed

Known limitations:

- The migration was not deployed to PostgreSQL because prior tasks recorded
  invalid local database credentials.
- Local tender commands complete immediately. External gateway initiation,
  callback signature verification, asynchronous settlement, and reconciliation
  jobs require a dedicated gateway task.
- Refund approval is a UI/domain placeholder; Task 16 completes authorized
  refunds immediately.
- Business date currently uses the UTC calendar day. A future shift module must
  derive it from outlet timezone, configured cutoff, and open shift.
- Receipt and invoice creation, fiscal submission, and delivery are deferred to
  Task 17.

## Task 15 Completion

Completed on 2026-06-11.

Implemented:

- Prisma `BillNumberCounter`, `Bill`, `BillItem`, and `BillTax` models
- `BillStatus` and `BillSource` enums
- Atomic outlet/day numbering in `BILL-YYYYMMDD-00001` format
- Tenant/outlet composite ownership, forced RLS, money/formula constraints,
  and void audit constraints
- Migration `20260612040000_add_billing_module`
- Completed-order bill generation from immutable order pricing/tax snapshots
- Bill list, detail, update, void, print/reprint, split, and merge endpoints
- CGST/SGST and IGST tax breakdowns with integer minor-unit allocation
- Exact-total preservation across equal, custom-amount, item-based split, and
  merge replacement flows
- Platform, tenant, manager, cashier, waiter read-only, and kitchen-denied
  authorization
- Generation and void audit users/timestamps plus print/reprint counters
- Typed `BillGenerated`, `BillPaid`, and `BillVoided` event placeholders
- Shared Dart bill/item/tax/status/source/split models and `BillingApiService`
- Riverpod `billProvider`, `billDetailsProvider`, and `billsProvider`
- Restaurant-app bill generation, list, detail, split, and merge screens
- API, database, tax, split, merge, role, and audit documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 59 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get` for restaurant-app: passed
- `flutter analyze` for restaurant-app: passed
- `flutter test` for restaurant-app: passed, 9 tests

Known limitations:

- The migration was not deployed to PostgreSQL because prior tasks recorded
  invalid local database credentials.
- Payment allocation, settlement, invoice numbering, refunds, and fiscal
  submission are intentionally deferred to Task 16 or later.
- Realtime publishers are typed no-op placeholders until Socket.IO is
  explicitly approved.
- Amount-based split bills use explicit share line items because tender/payment
  splitting does not yet exist.

## Task 14 Completion

Completed on 2026-06-11.

Implemented:

- Prisma `KitchenCategory` model and `OrderPriority` enum
- Tenant/outlet category ownership, forced RLS, routing indexes, and migration
  `20260612010000_add_kitchen_display_system`
- Menu item station assignment and order-item kitchen routing snapshots
- Fired, started, ready, served, estimated-prep, and actual-prep fields
- Order priority and estimated completion fields
- Protected queue, active, ready, completed, category, item transition, and
  bulk order transition endpoints
- Priority-first and oldest-first queue ordering with station, status, search,
  and priority filters
- `ON_TIME`, `AT_RISK`, and `DELAYED` SLA classification
- Platform, tenant, manager, kitchen, waiter, and cashier access boundaries
- Typed KDS event placeholders for later realtime transport
- Shared Dart KDS/order/menu models and typed `KdsApiService`
- Riverpod KDS providers and restaurant-app dashboard, queue, ready, and
  completed screens
- API, database, and KDS workflow documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 48 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter pub get` for restaurant-app: passed
- `flutter analyze` for restaurant-app: passed
- `flutter test` for restaurant-app: passed, 9 tests
- `git diff --check`: passed

Known limitations:

- The migration was not deployed to PostgreSQL because prior tasks recorded
  invalid local database credentials.
- Realtime delivery remains deferred. Event publishers are typed no-op
  placeholders until the Socket.IO contract is approved.
- A menu item has one default kitchen category. Order creation validates that
  the category belongs to the order outlet and leaves invalid cross-outlet
  assignments unrouted; outlet-specific routing overrides require a later
  explicit contract.

## Task 13 Completion

Completed on 2026-06-11.

Implemented:

- Prisma `Order`, `OrderItem`, and `OrderNumberCounter` models
- Order type, order status, and order item status enums
- Atomic outlet/day numbering in `ORD-YYYYMMDD-00001` format
- Tenant/outlet composite ownership, forced RLS, commercial snapshots,
  nonnegative minor-unit money constraints, and lifecycle checks
- Migration `20260611230000_add_order_management`
- Protected order create/list/detail/update/status/cancel/transfer endpoints
- Order item add/update/soft-delete endpoints and transactional recalculation
- Dine-in, takeaway, delivery, and future QR order validation
- Table occupancy integration for create, completion, cancellation, and transfer
- Kitchen queue and kitchen status-only authorization
- Read-only operational menu access for waiter/cashier order entry
- Typed `OrderCreated`, `OrderUpdated`, and `OrderStatusChanged` placeholders
- Order permission seed entries and schema/access contract tests
- Shared Dart order models and typed `OrdersApiService`
- Riverpod `activeOrdersProvider`, `orderDetailsProvider`, and
  `kitchenQueueProvider`
- Restaurant-app order list, detail, create, edit, and kitchen queue screens
- GoRouter and role-dashboard integration with customer/kitchen restrictions
- API, database, lifecycle, and kitchen-flow documentation

Validation:

- `npx.cmd prisma format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 43 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `flutter pub get` for restaurant-app: passed
- `flutter analyze` for restaurant-app: passed
- `flutter test` for restaurant-app: passed, 9 tests
- `dart analyze` for shared models and API client: passed
- `git diff --check`: passed

Known limitations:

- The migration was not deployed to PostgreSQL because prior tasks recorded
  invalid local database credentials.
- The customer aggregate does not yet exist. `Order.customerId` is a validated
  tenant-scoped UUID field without a foreign key; the customer module must add
  that tenant-aware relation later.
- Event publishers are intentional no-op placeholders. Socket.IO remains
  deferred.

## Task 12 Completion

Completed on 2026-06-11.

Implemented:

- Prisma `TableSection`, `DiningTable`, `TableReservation`, and `MergedTable`
  models with tenant/outlet composite ownership
- Table, shape, and reservation status enums; capacity, coordinate, uniqueness,
  and active reservation-slot constraints
- Migration `20260611210000_add_table_management` with forced RLS policies
- Protected section, table, reservation, status, merge, split, and transfer APIs
- Write access for platform/tenant admins and managers; read-only access for
  waiters and cashiers; kitchen access denied
- Transactional reservation status effects, merge/split, and occupancy transfer
- Table permission seed entries and Prisma/access contract tests
- Shared Dart table models and typed `TablesApiService`
- Riverpod repositories/providers and admin layout, section, table, and
  reservation screens
- API, database, and module specification documentation

Validation:

- `npm.cmd run prisma:format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 39 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `dart analyze` for shared models and API client: passed
- `flutter analyze` for admin: passed
- `flutter test` for admin: passed, 1 test
- `flutter build web` for admin: passed

Known limitation:

- The table migration was not deployed to a live PostgreSQL database because
  prior tasks recorded invalid local database credentials.
- Live API calls require deployed migrations, a valid datasource, authenticated
  tokens, `API_BASE_URL`, and an `OUTLET_ID` for tenant-admin create workflows.

## Task 11 Completion

Completed on 2026-06-11.

Implemented:

- Prisma `MenuCategory`, `MenuItem`, `MenuItemVariant`, `MenuItemAddon`, and
  `OutletMenuPrice` models
- Category hierarchy, tenant-aware composite foreign keys, minor-unit money
  constraints, tax bounds, soft deletion, versions, and forced RLS
- Migration `20260611180000_add_menu_management`
- Protected Swagger category and menu item CRUD endpoints
- Variant and add-on create/list/delete endpoints
- Outlet-specific prices through menu item create/update contracts
- `SUPER_ADMIN`, `TENANT_ADMIN`, and `MANAGER` access; operational roles denied
- Search, category/availability filtering, sorting, and pagination
- Menu permission seed entries and schema contract tests
- Backend-aligned shared models and typed `MenuApiService`
- Runnable Flutter Web admin app and workspace registration
- Riverpod `categoryProvider` and `menuItemsProvider`
- Menu dashboard, category list/add/edit, and item list/add/edit screens
- Loading, error, empty, search, and pagination presentation states
- API, database ERD, and module specification documentation

Validation:

- `npm.cmd run prisma:format`: passed
- `npm.cmd run prisma:generate`: passed
- `npm.cmd run prisma:validate`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run test -- --runInBand`: passed, 35 tests
- `npm.cmd run test:e2e -- --runInBand`: passed, 7 tests
- `flutter pub get`: passed
- `flutter analyze`: passed with no issues
- `flutter test apps/admin`: passed, 1 test
- `flutter test apps/restaurant-app`: passed, 9 tests
- `flutter test packages/auth`: passed, 3 tests
- `flutter build web` from `apps/admin`: passed
- `git diff --check`: passed

Known limitation:

- The committed menu migration was not deployed to a live PostgreSQL database.
  Previous tasks recorded invalid local PostgreSQL credentials, so no database
  mutation was attempted.
- Endpoint behavior was verified through unit and application e2e compilation
  tests, but database-backed menu CRUD requires migration deployment and a valid
  local datasource.

## Task 10 Completion

Completed on 2026-06-11.

Implemented:

- `AuthStatus` and immutable `AuthState` with user, tokens, and safe error text
- Riverpod `AuthNotifier` for login, restore, session expiry, and logout
- `flutter_secure_storage` token persistence; passwords are never stored
- Dio-backed `AuthRepositoryImpl` using the Task 9 API client
- Bearer-token injection, serialized refresh rotation, one-time request retry,
  token replacement, and forced local logout after refresh failure
- Compile-time `API_BASE_URL` configuration with no embedded API host
- Splash and login screens built from `restaurant_pos_ui_kit`
- GoRouter authentication guards and `/login`, `/dashboard`, and role routes
- Dashboard placeholders for `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER`,
  `CASHIER`, `WAITER`, `KITCHEN_STAFF`, and `CUSTOMER`
- Backend logout followed by unconditional local token clearing
- Removal of the obsolete Firebase auth bootstrap and Provider dependency
- `docs/architecture/frontend-authentication.md`

Validation:

- `dart format` on changed Dart source and tests: passed
- `flutter analyze`: passed with no issues
- `flutter test packages/auth`: passed, 3 tests
- `flutter test apps/restaurant-app`: passed, 9 tests
- `git diff --check`: passed
- Scope audit confirmed no files under `backend/` were modified

Known limitation:

- Standalone `flutter pub get` resolved and downloaded all dependencies but
  returned a nonzero exit on Windows because plugin symlink creation requires
  Developer Mode. `flutter analyze` and both test suites still completed
  successfully with the resolved dependencies.
- Live login against PostgreSQL-backed NestJS endpoints was not exercised
  because no runnable API/database environment was configured for this task.

## Task 9 Completion

Completed on 2026-06-11.

Implemented:

- Root Dart pub workspace integration for all seven shared packages
- Standardized `restaurant_pos_*` package identifiers and application imports
- Framework-independent core configuration, constants, failures, results,
  currency formatting, and UTC date utilities
- Backend-aligned auth, tenant, outlet, status, pagination, and token models
- Dio client configuration, endpoint constants, bearer-token/error
  interceptors, and typed auth/tenant/outlet services
- Shared auth repository, token storage, state, and role-access contracts
- Flutter colors, typography, themes, navigation, buttons, fields, cards,
  loading, and empty-state widgets
- Privacy-safe analytics contracts and common validation/string utilities
- Package READMEs and `docs/architecture/frontend-architecture.md`

Validation:

- `flutter pub get`: passed
- `dart format` on package/app source and tests: passed
- `flutter analyze`: passed with no issues
- `flutter test apps/restaurant-app`: passed, 9 tests

Known limitation:

- Legacy `serveiq_*` barrel files remain as temporary re-export shims for source
  compatibility. New code uses only `restaurant_pos_*` imports.

## Task 8 Completion

Completed on 2026-06-10.

Implemented:

- `TenantsModule` with create, list, get, update, and status endpoints
- `OutletsModule` with create, list, get, update, status, and tenant outlet-list
  endpoints
- `SUPER_ADMIN`, `TENANT_ADMIN`, and `MANAGER` access boundaries
- Global platform-admin identity through `UserAccount.isPlatformAdmin`
- Transaction-local user, tenant, and platform-admin PostgreSQL context
- Forced-RLS policies that preserve tenant isolation and permit trusted platform
  administration
- Tenant and outlet lifecycle enum additions
- Tenant contact fields and positive `outletLimit`
- Outlet contact and address fields
- Pagination, search, and status filters
- Atomic non-closed outlet counting and subscription-limit enforcement
- Safe response DTOs and Swagger documentation

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 28 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests

Known limitation:

- `npx prisma migrate dev --name add_tenant_outlet_management` returned a Prisma
  schema-engine connection error before applying migrations to the configured
  local PostgreSQL database.
- The committed migration is
  `backend/api/prisma/migrations/20260610180000_add_tenant_outlet_management/migration.sql`.
- Database-backed endpoint execution requires valid local PostgreSQL credentials
  and deployment of all committed migrations.

## Task 7 Completion

Completed on 2026-06-10.

Implemented:

- `AuthModule`, controller, service, DTOs, JWT strategy, guard, decorator, and
  authentication types
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- Optional bcrypt password hash on global user accounts
- Global refresh-token model with hashed token, expiry, revocation, and
  replacement tracking
- User-context RLS helper for membership discovery before tenant context is set
- Local-only demo tenant/admin seed
- Swagger bearer authentication and endpoint documentation

Dependencies:

- Runtime: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`,
  `bcrypt`
- Development: `@types/passport-jwt`, `@types/bcrypt`

Validation:

- `npm install`: passed, zero reported vulnerabilities
- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 19 tests
- `npm run test:e2e -- --runInBand`: passed, 5 tests
- Strict standalone TypeScript compile of `prisma/seed.ts`: passed

Known limitation:

- `npx prisma migrate dev --name add_refresh_tokens` could not connect through
  the configured local PostgreSQL datasource and returned a Prisma schema-engine
  error before applying migrations.
- The committed migration is
  `backend/api/prisma/migrations/20260610150000_add_refresh_tokens/migration.sql`.
- Database-backed login and seed execution require valid local PostgreSQL
  credentials and migration deployment.

## Task 6 Completion

Completed on 2026-06-10.

Files changed:

- `backend/api/prisma/schema.prisma`
- `backend/api/prisma/seed.ts`
- `backend/api/prisma/migrations/migration_lock.toml`
- `backend/api/prisma/migrations/20260610120000_tenancy_authorization_foundation/migration.sql`
- `backend/api/src/prisma/schema-contract.spec.ts`
- `backend/api/tsconfig.build.json`
- `backend/api/README.md`
- `backend/database/README.md`
- `backend/migrations/README.md`
- `docs/database/README.md`
- `docs/database/initial-erd.md`
- `docs/database/tenancy-authorization-schema.md`

Decisions:

- `UserAccount` and `Permission` are global.
- Tenant memberships, roles, outlets, and assignment tables carry tenant scope.
- Composite tenant-aware foreign keys prevent cross-tenant assignments.
- PostgreSQL generates UUIDv7 identifiers through `app_uuid_v7()`.
- Email and role-name uniqueness use `citext`.
- Master records use restrictive deletes and explicit soft deletion or
  revocation.
- Tenant-owned tables use forced PostgreSQL row-level security.
- The seed idempotently upserts global permissions only and creates no tenant,
  user, credentials, or assignments.

Validation:

- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 13 tests
- `npm run test:e2e -- --runInBand`: passed, 1 test
- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- Standalone strict TypeScript compile of `prisma/seed.ts`: passed
- `git diff --check`: passed
- Prisma migration SQL generation from the schema: passed

Known limitation:

- PostgreSQL accepted TCP connections on `localhost:5432`, but the credentials
  currently configured in `backend/api/.env` were rejected for user `postgres`.
- Because credentials were invalid, `prisma migrate deploy` and `prisma db seed`
  were not executed against the local database.
- No credentials were modified or exposed.

## Next Task

### Task 25: Implement Audit & Activity Logging Module

Do not start Task 25 unless explicitly requested. Define append-only event
ownership, actor and impersonation context, tenant/outlet scope, sensitive-data
redaction, retention, query/export contracts, and authorization before Flutter
screens.

## Future Work

- Add password reset, verification, MFA, and explicit tenant switching when
  those contracts are approved.
- Extend permission guards across legacy modules incrementally without
  weakening their existing role and tenant checks.
- Define menu, pricing, tax, order, kitchen, payment, inventory, customer, and
  loyalty contracts in backend-first order.
- Extend Socket.IO beyond kitchen workflows only after durable events and
  authorization exist for each module.
- Add SQLite sync after server command, idempotency, versioning, and change-feed
  contracts exist.
- Add PM2, Nginx, Ubuntu deployment, backups, and operational documentation.

## Update Template

Append or revise this log after substantive work:

```text
Date:
Task:
Status:
Files changed:
Decisions:
Validation:
Known limitations:
Next task:
```
