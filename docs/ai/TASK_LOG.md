# AI Task Log

Last updated: 2026-06-14

## Status Legend

- `COMPLETE`: Required foundation exists and was verified in the repository.
- `IN PROGRESS`: Work has started but the task is not complete.
- `NEXT`: Approved next task; no implementation has started.
- `PLANNED`: Known future work.

## Current Summary

Tasks 1 through 28.6 are complete at the requested foundation level.

The worktree contains uncommitted project changes. Future agents must inspect and
preserve them rather than assuming a clean checkout.

Task 29, Promotions, Coupons, and Discount Policy Engine, is the next
provisional roadmap item. It is not approved for implementation until
explicitly requested.

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
| 27.2. Communication Template Management | COMPLETE | Tenant template CRUD, immutable versions, strict variable rendering, preview, permissions, audit events, and exact message version references are implemented. |
| 27.3. Email Delivery Providers | COMPLETE | SMTP execution, protected recipient decryption, append-only attempts, status tracking, history APIs, permissions, and audit events are implemented. |
| 27.4. SMS Delivery Providers | COMPLETE | Twilio SMS execution, E.164 validation, protected credentials, shared delivery orchestration, attempts/status, and audit events are implemented. |
| 27.5. WhatsApp Delivery Providers | COMPLETE | Twilio WhatsApp approved-template execution, protected credentials, delivered/read status foundation, and audit events are implemented. |
| 27.6. Push Notification Delivery | COMPLETE | FCM HTTP v1 delivery, encrypted tenant/user devices, invalid-token deactivation, attempts/status, and audit events are implemented. |
| 27.7. Webhooks and Delivery Tracking | COMPLETE | Verified Twilio and provider-neutral callbacks, immutable idempotent webhook events, centralized delivery synchronization, and audit events are implemented. |
| 27.8. Communication Center UI | COMPLETE | Provider administration APIs, shared communication contracts, typed clients, Riverpod state, and admin dashboard/template/history/provider screens are implemented. |
| 27.9. Communication Analytics | COMPLETE | Tenant/outlet KPIs, channel/provider delivery performance, webhook latency, trends, typed clients, and admin reporting are implemented. |
| 28.1. Plan Management | COMPLETE | Platform-managed versioned plans, feature snapshots, immutable activated versions, protected APIs, tests, and audit events are implemented. |
| 28.2. Subscription Lifecycle | COMPLETE | Tenant subscription aggregates, exact plan references, idempotent transitions, append-only history, RLS, tests, and audit events are implemented. |
| 28.3. Feature Entitlements | COMPLETE | Tenant overrides, exact plan-version evaluation, fail-closed subscription checks, reusable enforcement, RLS, tests, and audit events are implemented. |
| 28.4. Usage Limits | COMPLETE | Tenant counters, immutable idempotent operations, atomic limit enforcement, configurable over-limit policies, RLS, tests, and audit events are implemented. |
| 28.5. Trial Management | COMPLETE | Trial subscriptions, immutable trial history, extension, expiry, due-expiry processing, paid conversion, RLS, tests, and audit events are implemented. |
| 28.6. Subscription Admin UI | COMPLETE | Shared subscription models/client, Riverpod providers, and admin plan, subscription, entitlement, usage, and trial screens are implemented. |

## Task 28.1-28.6 Repair Review

Completed on 2026-06-14.

Reason:

- Some Task 28 prompts had incorrectly referenced
  `docs/specifications/communication-module.md` instead of
  `docs/specifications/subscription-module.md`.

Review result:

- No Task 28 implementation files, APIs, models, providers, screens, or task
  documents referenced `communication-module.md`.
- No subscription module code was created under communication paths.
- No communication providers, messages, templates, webhooks, delivery tracking,
  email, SMS, WhatsApp, or push concepts were found inside the Task 28
  subscription implementation.
- References to `communication` as a feature key example are valid subscription
  entitlement examples and were retained.

Repairs:

- Corrected the shared `TenantSubscription` Dart contract to use
  `SubscriptionPlanSummary`, matching the backend Task 28.2 response shape.
- Updated subscription module documentation that still described
  administration UI as deferred after Task 28.6 completion.

Validation:

- `flutter analyze` in `packages/shared_models`: passed
- `flutter analyze` in `packages/api_client`: passed
- `flutter analyze` in `apps/admin`: passed
- `git diff --check`: passed with only existing LF-to-CRLF warnings

Backend validation:

- Not run for this repair because no backend TypeScript, Prisma schema, or
  migration files changed. Only a backend README was updated.

## Task 28.6 Completion

Completed on 2026-06-14.

Implemented:

- Shared Dart subscription contracts for plans, plan features, tenant
  subscriptions, lifecycle history, entitlement evaluations, usage counters,
  usage-limit evaluations, trials, trial events, and due-expiry results
- Typed `SubscriptionApiService` covering Task 28.1 through 28.5 subscription
  endpoints
- Admin subscription repository and Riverpod providers
- Admin Subscription Administration center
- Plan catalog screen with create, activate, deactivate, feature replacement,
  and version inspection actions
- Tenant subscription screen with tenant-scoped listing, lifecycle history,
  activation, plan change, and status transition actions
- Entitlements screen with effective entitlement visibility plus override and
  revoke actions for platform admins
- Usage screen with tenant usage counter visibility and reconciliation action
- Trial management screen with start, extend, expire, convert, and expire-due
  actions
- Admin navigation entry gated by platform, tenant-admin, or subscription
  permissions
- Subscription module, roadmap, status, and AI-context documentation updates

Decisions:

- No backend schema, migration, or controller changes were required; Task 28.6
  consumes the APIs implemented in Tasks 28.1 through 28.5.
- Backend authorization remains authoritative. The admin UI hides mutation
  controls from tenant admins but does not rely on client checks for security.
- Tenant admins view their authenticated tenant scope; super admins can enter a
  tenant ID for platform support and administration.
- Idempotency keys are generated per UI mutation command with stable prefixes
  and UTC microsecond timestamps.

Validation:

- `flutter pub get` in `apps/admin`: passed
- `flutter pub get` in `packages/api_client`: passed
- `flutter pub get` in `packages/shared_models`: passed
- `flutter analyze` in `packages/shared_models`: passed
- `flutter analyze` in `packages/api_client`: passed
- `flutter analyze` in `apps/admin`: passed

Known limitations:

- Live UI workflows were not exercised against a running backend in this task.
- Backend tests were not rerun because Task 28.6 did not change backend code.

Next task:

- Task 29: Promotions, Coupons, and Discount Policy Engine remains provisional.
  Do not implement it unless explicitly requested.

## Task 28.5 Completion

Completed on 2026-06-13.

Implemented:

- Tenant-scoped `TrialSubscription` aggregate
- Immutable `TrialSubscriptionEvent` lifecycle history
- `ACTIVE`, `EXPIRED`, and `CONVERTED` trial statuses
- Start trial command that creates a linked `TenantSubscription` in `TRIAL`
  status
- Extend command that updates the trial period and linked subscription end
- Expire command that updates the trial and linked subscription to expired
- Platform `expire-due` processor endpoint for future scheduler integration
- Convert command that activates the linked subscription with an exact paid
  plan version
- One trial per tenant and one active trial per tenant constraints
- Period, status timestamp, optimistic version, and tenant-aware foreign-key
  constraints
- Forced PostgreSQL RLS on trial aggregates and trial events
- Delete prevention for trial aggregates and append-only event triggers
- Tenant-admin self-read and platform-only mutation authorization
- Tenant-scoped idempotency keys and request fingerprints
- Tenant advisory locking for trial lifecycle commands
- Trial lifecycle audit events for start, extension, expiry, and conversion
- Protected list, detail, history, start, extend, expire, convert, and
  expire-due APIs
- API, module, specification, roadmap, and AI-context documentation
- Focused schema, start, extend, convert, and due-expiry tests

Decisions:

- Trial access flows through the existing Task 28.3 entitlement evaluator by
  using linked `TenantSubscription` status changes rather than a separate
  trial-specific access path.
- Conversion updates the same linked subscription to `ACTIVE` instead of
  creating a second current subscription.
- `expire-due` is a platform-callable hook only; no scheduler, queue, or new
  infrastructure was introduced.
- Subscription administration UI was completed in Task 28.6.

Validation:

- `npm run prisma:generate`: passed
- `npm run prisma:validate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm test -- --runInBand`: passed, 81 suites and 278 tests
- `npm run test:e2e -- --runInBand`: passed, 2 suites and 7 tests

## Task 28.4 Completion

Completed on 2026-06-13.

Implemented:

- Tenant-scoped `UsageCounter` current-period projections using PostgreSQL
  `BIGINT`
- Immutable `UsageCounterEvent` operation history with tenant-scoped
  idempotency keys and request fingerprints
- UTC `LIFETIME`, `DAILY`, and `MONTHLY` counter periods
- Effective-entitlement `limitValue` enforcement
- Entitlement metadata policies for `BLOCK`, `WARN`, and `ALLOW` overages
- Lifetime/block defaults and unlimited null-limit behavior
- Atomic consumption with tenant/feature/period advisory locking
- Persisted denied decisions and allowed overages
- BigInt-safe decimal-string API responses
- Platform-only counter reconciliation with optimistic versions and reasons
- Tenant-admin self-read and platform cross-tenant read authorization
- Forced PostgreSQL RLS, non-negative/period constraints, restrictive foreign
  keys, retained counters, and append-only event triggers
- Audited denied operations, allowed overages, and privileged adjustments
- Protected counter list, evaluation, and reconciliation APIs
- Internal `UsageLimitsService.consumeForActor()` enforcement contract
- API, module, specification, roadmap, and AI-context documentation
- Focused schema, period, atomic consumption, blocking, warning, and audit tests

Decisions:

- Period and over-limit behavior are configured through effective entitlement
  metadata keys `usagePeriod` and `overLimitAction`.
- Regular successful consumption writes immutable usage history but does not
  create high-volume audit ledger events.
- Existing business modules were not mass-integrated because existing tenants
  have not yet been migrated to subscription records; integrations must use the
  centralized service during deliberate rollout.
- Trial behavior remains Task 28.5.

Validation:

- `npm run prisma:generate`: passed
- `npm run prisma:validate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm test -- --runInBand`: passed, 79 suites and 271 tests
- `npm run test:e2e -- --runInBand`: passed, 2 suites and 7 tests

## Task 28.3 Completion

Completed on 2026-06-13.

Implemented:

- Tenant-scoped `TenantEntitlement` records with unique feature overrides
- Exact subscribed plan-version features as the baseline entitlement source
- Active, effective-dated override precedence over plan features
- Fail-closed access for missing, suspended, expired, cancelled, future, or
  ended subscriptions
- Explicit override revocation with plan fallback and delete prevention
- Optional limit metadata reserved for Task 28.4 enforcement
- Tenant-scoped idempotency keys, request fingerprints, advisory locks, and
  optimistic versions
- Forced PostgreSQL RLS and restrictive tenant/user foreign keys
- `TenantEntitlementsService` for administration and trusted actor evaluation
- `@RequiresEntitlement()` and `EntitlementGuard` for business route
  enforcement
- Platform-only mutation, tenant-admin self-read, and platform support bypass
- Audited create, update, and revoke operations
- Protected list, evaluate, upsert, and revoke APIs
- API, module, specification, roadmap, and AI-context documentation
- Focused schema, precedence, fail-closed, actor-enforcement, and guard tests

Decisions:

- Overrides cannot grant features unless the tenant has a current, in-period
  `ACTIVE` or `TRIAL` subscription.
- Existing business modules were not gated en masse because existing tenants
  have not yet been migrated to subscription records; the reusable enforcement
  boundary is ready for deliberate rollout.
- Usage consumption and counters remain Task 28.4.

Validation:

- `npm run prisma:generate`: passed
- `npm run prisma:validate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm test -- --runInBand`: passed, 77 suites and 263 tests
- `npm run test:e2e -- --runInBand`: passed, 2 suites and 7 tests

## Task 28.2 Completion

Completed on 2026-06-13.

Implemented:

- Tenant-scoped `TenantSubscription` current-state aggregates
- Immutable `TenantSubscriptionEvent` history with prior/new status and exact
  prior/new plan-version references
- `TRIAL`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, and `CANCELLED` lifecycle states
- Initial activation plus upgrade, downgrade, suspend, resume, expire, and
  cancel commands
- One current `TRIAL`, `ACTIVE`, or `SUSPENDED` subscription per tenant
- Active-plan validation for initial activation and plan changes while
  preserving already assigned historical plan references
- Tenant-scoped idempotency keys with request fingerprints
- Optimistic aggregate version checks and tenant advisory locking
- Subscription period and status timestamp database constraints
- Restrictive tenant, plan, actor, aggregate, and event foreign keys
- Forced PostgreSQL RLS on subscription aggregates and events
- Database triggers preventing aggregate deletion and event update/delete
- Platform-only lifecycle mutation and tenant-admin self-read authorization
- Tenant-scoped audit events for every lifecycle transition
- Protected list, current, detail, history, activation, plan-change, status,
  expiration, and cancellation APIs
- API, module, specification, roadmap, and AI-context documentation
- Focused schema, access, transition, idempotency, and validation tests

Decisions:

- Tenant subscriptions reference exact Task 28.1 plan-version IDs.
- Upgrade and downgrade are explicit platform intent rather than price-derived
  classifications because currencies and billing intervals are not directly
  comparable.
- Plan changes are allowed only while the subscription is active.
- `TRIAL` is included in the lifecycle state machine, but trial creation and
  automatic expiration remain Task 28.5.
- Entitlement evaluation, usage enforcement, billing, shared Flutter
  contracts, and administration UI remain out of scope.

Validation:

- Backend `npm run prisma:format`: passed
- Backend `npm run prisma:validate`: passed
- Backend `npm run prisma:generate`: passed
- Backend `npm run lint`: passed
- Backend `npm run build`: passed
- Backend `npm run test -- --runInBand`: passed, 252 tests
- Backend `npm run test:e2e -- --runInBand`: passed, 7 tests
- Seed TypeScript compile: passed
- Focused subscription tests: passed, 22 tests
- `git diff --check`: passed with line-ending warnings only

Known limitation:

- The migration was not deployed because the recorded local PostgreSQL
  credentials remain unavailable. Prisma validation and schema contract tests
  passed.

Next task:

- Task 28.3 Feature Entitlements, only when explicitly requested.

## Task 28.1 Completion

Completed on 2026-06-13.

Implemented:

- Global `SubscriptionPlan` and `SubscriptionPlanFeature` Prisma models
- Stable case-insensitive plan codes with numbered versions
- Draft, active, and inactive lifecycle with one active version per code
- Integer minor-unit prices, ISO currency codes, monthly/yearly intervals, and
  non-negative feature limits
- Draft plan creation, update, feature replacement, list, detail, and version
  history APIs
- Updating an activated or deactivated plan creates the next draft version and
  copies the immutable feature snapshot
- Activation atomically deactivates the prior active version for the same code
- Optimistic concurrency on every mutable command
- PostgreSQL checks, restrictive foreign keys, partial active-version
  uniqueness, and activated plan/feature immutability triggers
- Platform-only `SUPER_ADMIN` authorization
- Immutable platform audit events for create, update, version creation,
  feature replacement, activation, and deactivation
- API and module documentation plus focused schema, access, and service tests

Decisions:

- Plans are global platform catalog data, not tenant-owned records.
- A future tenant subscription will reference an exact plan-version ID so
  historical commercial and feature terms remain reproducible.
- Activated and deactivated versions cannot be edited. Their update path
  creates a new draft under the same stable code.
- Feature `limitValue` is catalog metadata only in Task 28.1; enforcement is
  deferred to Task 28.4.
- Tenant subscriptions, entitlements, trials, billing, shared Flutter
  contracts, and administration UI remain out of scope.

Validation:

- Backend `npm run prisma:format`: passed
- Backend `npm run prisma:validate`: passed
- Backend `npm run prisma:generate`: passed
- Backend `npm run lint`: passed
- Backend `npm run build`: passed
- Backend `npm run test -- --runInBand`: passed, 241 tests
- Backend `npm run test:e2e -- --runInBand`: passed, 7 tests
- Seed TypeScript compile: passed
- Focused subscription tests: passed, 11 tests
- `git diff --check`: passed with line-ending warnings only

Known limitation:

- The migration was not deployed because the recorded local PostgreSQL
  credentials remain unavailable. Prisma validation and schema contract tests
  passed.

Next task:

- Task 28.2 Subscription Lifecycle, only when explicitly requested.

## Task 27.9 Completion

Completed on 2026-06-13.

Implemented:

- Protected `GET /communication/analytics` aggregate report
- Focused summary, channel, provider, and trend analytics endpoints
- Tenant and optional outlet isolation using trusted authentication context,
  tenant-aware filtering, and forced RLS
- Explicit `communication.analytics_view` permission, increasing the current
  permission catalog to 191 entries
- Default rolling 30-day reporting and a maximum 366-day UTC range
- Daily, weekly, and monthly UTC trend buckets
- Total, delivered/read, failed, pending, and cancelled message KPIs
- Terminal delivery success and failure rates that exclude non-terminal states
- Per-channel volume, delivery success/failure, and average delivery latency
- Per-provider volume, final outcome rates, average delivery latency, and
  immutable webhook processing latency
- Database-side aggregation without loading communication history into memory
- Shared Dart analytics scope, metric, channel, provider, and trend contracts
- Typed Dio analytics client and Riverpod family provider keyed by report range
- Admin date controls, trend grouping, KPI cards, channel performance,
  provider performance, latency display, and delivery trend visualization
- Focused analytics authorization, aggregation, range, and dashboard widget
  regression tests

Decisions:

- `DELIVERED` and `READ` are terminal successes; `FAILED` is terminal failure.
  Success/failure rates exclude queued, processing, sent, and cancelled records.
- Delivery latency measures non-negative time from provider acceptance
  (`sentAt`) to confirmed delivery (`deliveredAt`).
- Webhook latency measures non-negative provider event occurrence to local
  processing using immutable webhook timestamps.
- Trend buckets use UTC to avoid deployment/session timezone differences.
- Analytics remain live database aggregates. Materialized facts, scheduled
  rollups, exports, campaign attribution, and AI recommendations are out of
  scope.

Validation:

- Backend `npm run lint`: passed
- Backend `npm run build`: passed
- Backend `npm run test -- --runInBand`: passed, 230 tests
- Backend `npm run test:e2e -- --runInBand`: passed, 7 tests
- Seed TypeScript compile: passed
- Focused communication analytics tests: passed, 4 tests
- Shared models `flutter analyze`: passed
- API client `flutter analyze`: passed
- Admin `flutter analyze`: passed
- Admin `flutter test`: passed, 2 tests
- Admin `flutter build web`: passed
- In-app browser smoke check of the compiled admin web build: passed
- `git diff --check`: passed with line-ending warnings only

Known limitations:

- Live database aggregation was not exercised because the existing local
  PostgreSQL configuration remains unavailable.
- The Flutter web build continues to report the pre-existing Socket.IO
  WebAssembly compatibility warning; the JavaScript web build succeeds.

Next task:

- Task 28 SaaS Plans, Subscriptions, Entitlements, and Limits, only when
  explicitly requested.

## Task 27.8 Completion

Completed on 2026-06-13.

Implemented:

- Tenant-scoped provider list, detail, create, and update APIs
- Optimistic provider version checks and channel/provider-key uniqueness
- `communication.provider_view` and `communication.provider_manage`
  permissions, increasing the current permission catalog to 190 entries
- Provider create/update audit events without credential values
- Environment-reference-only provider credentials and recursive rejection of
  embedded passwords, tokens, secrets, private keys, or credentials in metadata
- Shared Dart communication channel/status enums and provider, template,
  version, preview, message, and delivery-attempt models
- Typed Dio clients for providers, templates, versions, previews, message
  history, details, and attempts
- Admin communication repository, query contracts, and Riverpod providers
- Permission-aware Communication Center navigation and tab visibility
- Operational dashboard for total messages, delivered/read success rate,
  failures, and channel usage
- Template search/filter, create/update, variable definition, preview, and
  immutable version-history UI
- Message search/filter, protected content detail, and delivery-attempt
  inspection UI
- Provider status, priority, environment reference, configuration JSON, and
  capabilities administration UI

Decisions:

- Current dashboard totals are derived from existing authorized paginated
  message counts. Dedicated metric facts, trends, latency, and provider
  performance remain Task 27.9.
- Provider keys and channels are immutable after creation. Mutable provider
  settings use optimistic versioning.
- Provider status represents configured operational availability; Task 27.8
  does not add external network health probes.
- Secret values cannot be entered into provider metadata. Configuration stores
  environment references only and never returns resolved credentials.
- Resend operations, campaigns, segmentation, analytics reports, and
  restaurant-app communication administration remain out of scope.

Validation:

- Backend `npm run lint`: passed
- Backend `npm run build`: passed
- Backend `npm run test -- --runInBand`: passed, 226 tests
- Backend `npm run test:e2e -- --runInBand`: passed, 7 tests
- Seed TypeScript compile: passed
- Admin `flutter pub get`: passed
- Shared models `flutter analyze`: passed
- API client `flutter analyze`: passed
- Admin `flutter analyze`: passed
- Admin `flutter test`: passed, 1 test
- Admin `flutter build web`: passed
- Browser preview loaded the compiled application title; Flutter canvas
  semantics and screenshot capture were unavailable in the desktop browser
  session, so interactive visual verification was not completed

Known limitations:

- Live provider CRUD and communication data rendering were not exercised
  against PostgreSQL because the existing local database configuration remains
  unavailable.
- The Flutter web build reported a pre-existing Socket.IO WebAssembly
  compatibility warning; the JavaScript web build completed successfully.

Next task:

- Task 27.9 Communication Analytics, only when explicitly requested.

## Task 27.7 Completion

Completed on 2026-06-13.

Implemented:

- Tenant-scoped immutable `CommunicationWebhook` persistence with forced RLS,
  provider/message/attempt relations, and protected foreign keys
- Tenant/provider/provider-event uniqueness plus transaction advisory locking
  for idempotent replay handling
- Tenant/provider/provider-message attempt uniqueness for deterministic
  callback correlation
- Public `POST /communication/webhooks/:provider` ingestion with raw request
  body access and required provider identity
- Official Twilio request-signature verification against the configured exact
  public webhook URL
- Provider-neutral HMAC-SHA256 verification for future email and push adapters,
  including signed provider identity to prevent cross-provider replay
- Canonical Twilio form normalization and strict generic JSON event contracts
- Sanitized, bounded scalar event metadata without retaining raw payloads,
  signatures, credentials, recipient addresses, or provider error descriptions
- Central monotonic delivery synchronization for delivered, failed, bounced,
  complaint, and WhatsApp read outcomes
- Protection against late failure callbacks regressing delivered/read history
- Duplicate callbacks returning the existing event without repeating status
  updates or audit events
- Protected `GET /communication/messages/:id/attempts` history endpoint
- Transactional webhook-processed/ignored and delivery-state audit events plus
  isolated signature-verification failure auditing
- Official `twilio` SDK dependency for maintained signature verification
- Schema, signature, replay, synchronization, WhatsApp regression, and service
  tests

Decisions:

- Twilio callbacks are correlated by provider ID and provider message SID. The
  route provider key, provider record, configured URL, and signature must agree.
- Generic callbacks must sign a JSON envelope containing the provider ID,
  provider event ID, provider message ID, event type, and optional occurrence
  and error data.
- Webhook events are append-only. Corrections arrive as new provider events;
  existing events cannot be updated or deleted.
- SMTP and FCM do not provide one universal native delivery webhook contract.
  Future provider-specific adapters can normalize into the generic signed
  envelope without changing persistence or state synchronization.
- Task 27.7 adds no Flutter UI, templates, retries, analytics, campaign
  tracking, or generalized integration webhook framework.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npx tsc -p prisma/tsconfig.seed.json --noEmit`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 221 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- `npm audit --omit=dev`: passed, 0 vulnerabilities
- `git diff --check`: passed with line-ending warnings only
- `npm run prisma:migrate:deploy`: failed with the existing local Prisma
  schema-engine error before migration deployment

Known limitations:

- Provider callback execution was verified through unit/service tests because
  no live Twilio, email callback provider, Firebase callback source, or valid
  local PostgreSQL deployment was available.
- The committed migration is
  `backend/api/prisma/migrations/20260614180000_add_communication_webhooks/migration.sql`.
- Migration deployment remains subject to the existing invalid local
  PostgreSQL configuration.

Next task:

- Task 27.8 Communication Center UI, only when explicitly requested.

## Task 27.6 Completion

Completed on 2026-06-13.

Implemented:

- Firebase Cloud Messaging HTTP v1 provider adapter for `PUSH`
- OAuth access-token generation with `google-auth-library` and the Firebase
  Messaging scope
- Environment-referenced service-account JSON or key-file credentials
- Strict Firebase project ID, timeout, device-token, title, body, and scalar
  data validation
- Tenant/user-scoped Android, iOS, and web push device records with forced RLS
- AES-256-GCM token encryption, SHA-256 lookup hashes, and masked API responses
- Active-token uniqueness within each tenant and installation-based token
  rotation
- Authenticated `GET`, `POST`, and `DELETE /communication/push/devices`
  endpoints for the current tenant user
- Internal active-device destination resolution for transactional
  communication enqueueing
- Shared delivery-executor failure hook for channel-specific cleanup
- Automatic token invalidation only for token-specific FCM `UNREGISTERED` and
  `INVALID_ARGUMENT` errors
- Append-only communication attempts and transactional
  `communication.push.sent`, `.failed`, `push_device.registered`,
  `.unregistered`, and `.invalidated` audit events
- Push schema, registration, provider, delegation, invalidation, and regression
  tests

Decisions:

- Firebase Cloud Messaging is the initial push provider.
- Provider configuration stores only `projectId` and optional timeout.
  Credentials remain behind an environment `secretReference`.
- FCM provider acceptance maps to local message `SENT` and attempt `ACCEPTED`.
  FCM does not provide a general per-device delivery webhook through the send
  API, so no false `DELIVERED` transition is recorded.
- Push notification title, body, and scalar `pushData` come only from immutable
  communication message snapshots.
- Device APIs are self-service for the authenticated tenant user and never
  return plaintext tokens, ciphertext, or token hashes.
- Automatic retries, workers, client Firebase SDK wiring, UI, analytics, and
  generalized webhook processing remain deferred.
- No Flutter changes were made because backend contracts and device ownership
  must precede application SDK integration.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npx tsc -p prisma/tsconfig.seed.json --noEmit`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 211 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- Focused push schema, FCM adapter, device, and delivery tests: passed, 8 tests
- `npm audit --omit=dev`: passed, 0 vulnerabilities
- `git diff --check`: passed
- `npm run prisma:migrate:deploy`: failed with the existing local Prisma
  schema-engine error before migration deployment

Known limitations:

- FCM execution was tested with mocked HTTP responses because no live Firebase
  project credentials or client registrations were available.
- Migration deployment remains subject to the existing invalid local
  PostgreSQL configuration.

## Task 27.5 Completion

Completed on 2026-06-13.

Implemented:

- Twilio Messages REST API adapter for `WHATSAPP`
- E.164 recipient and sender validation with WhatsApp channel addressing
- Environment-backed Twilio auth-token resolution through existing
  `secretReference` contracts
- Mandatory immutable internal template and template-version references
- Provider configuration allowlist mapping each approved internal template
  version ID to a Twilio Content SID
- Strict scalar `whatsappVariables` validation against optional approved
  variable-name contracts
- Shared Twilio Messages HTTP client reused by SMS and WhatsApp adapters
- Twilio content and address retention privacy request controls
- Internal tenant-scoped provider status service for monotonic `DELIVERED` and
  `READ` updates
- `CommunicationMessageStatus.READ`, `readAt`, and provider-message lookup
  indexing
- Transactional `communication.whatsapp.sent`, `.failed`, `.delivered`, and
  `.read` audit events without credentials or recipient addresses
- WhatsApp schema, provider, delegation, delivery-state, and regression tests

Decisions:

- Twilio is the initial WhatsApp provider; Meta WhatsApp Business remains a
  future adapter behind the existing provider contract.
- Only approved Twilio Content templates may be sent. The immutable message body
  remains a local history snapshot and is never submitted as arbitrary
  WhatsApp `Body` content.
- Delivery/read status application is an internal service contract. Public
  callback routes, provider signature verification, and webhook persistence
  remain Task 27.7.
- Automatic retries, workers, scheduling, UI, analytics, and push delivery were
  not introduced.
- No Flutter or shared Dart changes were required because Task 27.5 adds no
  public API contract.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npx tsc -p prisma/tsconfig.seed.json --noEmit`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 202 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- Focused WhatsApp, Twilio SMS regression, state, and schema tests: passed, 14
  tests
- `npm audit --omit=dev`: passed, 0 vulnerabilities
- `git diff --check`: passed
- `npm run prisma:migrate:deploy`: failed with the existing local Prisma
  schema-engine error before migration deployment

Known limitations:

- Twilio execution was tested with mocked HTTP responses because no live
  account credentials or approved production templates were available.
- Public webhook verification, callback ingestion, and provider delivery
  synchronization remain deferred to Task 27.7.

## Task 27.4 Completion

Completed on 2026-06-13.

Implemented:

- Twilio Messages REST API adapter for `SMS`
- E.164 recipient validation before provider access
- Strict Twilio Account SID, sender number, Messaging Service SID, and timeout
  configuration validation
- Environment-backed auth-token resolution through existing
  `secretReference` contracts
- Twilio `ContentRetention=discard` and `AddressRetention=obfuscate` privacy
  request options
- Channel-neutral `CommunicationDeliveryExecutor` shared by SMTP email and
  Twilio SMS delivery
- Atomic queued-message claims, active tenant/provider validation, and
  append-only numbered attempts
- SMS progression from `QUEUED` to `PROCESSING`, then `SENT` or `FAILED`
- Safe HTTP/provider/network failure classification, including retryable 408,
  429, 5xx, timeout, and network outcomes
- Transactional `communication.sms.sent` and `communication.sms.failed` audit
  events without credentials, phone numbers, or provider error messages
- SMS API, database, environment, specification, roadmap, current-status, and
  restart-context documentation

Decisions:

- Twilio is the single initial SMS provider; MSG91 and TextLocal remain future
  adapters.
- Twilio acceptance maps to local `SENT`; carrier delivery confirmation remains
  Task 27.7.
- SMS bodies are limited to 1600 characters and stored only in the existing
  immutable communication message snapshot.
- No public send/resend API, scheduler, worker, retry execution, webhook, or
  Flutter UI is introduced.
- No new permissions or database migration were required; SMS reuses the Task
  27.3 communication send/history permissions and foundation schema.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npx tsc -p prisma/tsconfig.seed.json --noEmit`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 194 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- Focused Twilio adapter, SMS delegation, and shared delivery regression tests:
  passed, 7 tests
- `npm audit --omit=dev`: passed, 0 vulnerabilities
- `git diff --check`: passed
- `npm run prisma:migrate:deploy`: failed with the existing local Prisma
  schema-engine error before migration deployment

Known limitations:

- Twilio execution was tested with mocked HTTP responses because no live
  account credentials were available.
- Automatic retries and provider delivery receipts remain deferred.

## Task 27.3 Completion

Completed on 2026-06-13.

Implemented:

- Nodemailer 8 SMTP adapter for `EMAIL` messages
- Strict provider configuration validation for host, port, TLS, sender,
  reply-to, authentication, and bounded connection timeouts
- Environment-backed `env:VARIABLE_NAME` secret resolution without persisting
  or logging SMTP passwords
- AES-256-GCM recipient-address encryption/decryption using
  `COMMUNICATION_ADDRESS_ENCRYPTION_KEY`
- Atomic queued-message claiming with active tenant SMTP provider selection
- Append-only numbered attempts progressing through `PENDING`, `PROCESSING`,
  and `ACCEPTED`, `RETRYABLE_FAILED`, or `TERMINAL_FAILED`
- Message progression from `QUEUED` to `PROCESSING`, then `SENT` or `FAILED`
- Safe SMTP failure classification without storing provider exception messages
  or credentials
- Protected `GET /communication/messages` and
  `GET /communication/messages/:id` history APIs that expose masked addresses
  and safe attempt data only
- `communication.history_view` and `communication.send` permissions; tenant
  administrators receive both and managers receive outlet-scoped history only
- Transactional `communication.email.sent` and
  `communication.email.failed` audit events
- SMTP configuration, API, security, environment, specification, roadmap, and
  restart-context documentation

Decisions:

- SMTP acceptance maps to message `SENT` and attempt `ACCEPTED`; provider
  confirmation of `DELIVERED` remains Task 27.7.
- Delivery execution is an internal service. Task 27.3 adds no public
  send/resend endpoint, scheduler, queue worker, or automatic retry behavior.
- Retryable failures are classified for future orchestration but no
  `nextRetryAt` is assigned.
- Durable attachment storage/retrieval remains deferred because the approved
  file-storage abstraction is Task 35.
- SendGrid, Mailgun, and Amazon SES remain future adapters.
- The permission catalog now contains 191 permissions; historical task counts
  remain unchanged.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npx tsc -p prisma/tsconfig.seed.json --noEmit`: passed
- `npm run test -- --runInBand`: passed, 190 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- Focused SMTP, encryption, access, and delivery tests: passed, 11 tests
- `npm audit --omit=dev`: passed, 0 vulnerabilities
- `git diff --check`: passed
- `npm run prisma:migrate:deploy`: failed with the existing local Prisma
  schema-engine error before migration deployment

Known limitations:

- No live SMTP credentials or external SMTP server were available, so provider
  execution was validated with a mocked Nodemailer transport.
- No background worker invokes queued delivery automatically.
- No delivery webhook can promote `SENT` to `DELIVERED` until Task 27.7.
- No durable email attachment storage exists until the approved storage task.

## Task 27.2 Completion

Completed on 2026-06-13.

Implemented:

- `CommunicationTemplate` and immutable `CommunicationTemplateVersion` Prisma
  models with tenant-aware composite keys and exact message version references
- Migration `20260614060000_add_communication_templates` with forced RLS,
  content checks, directory/history indexes, message reference integrity, and
  immutable version triggers
- Protected create, list, detail, update, version-history, and preview APIs
- Aggregate optimistic concurrency; each accepted patch creates the next
  immutable version
- Strict `{{variableName}}` parsing with exact declarations and scalar-only
  render values
- Required subjects for email templates and required non-empty bodies for all
  channels
- `communication.template_view` and `communication.template_manage`
  permissions, assigned to tenant administrators by default
- Transactional audit events for template creation/update and every version
  creation without copying template content into audit metadata
- Communication message enqueue contracts that retain both template and exact
  template-version identifiers
- API, database, specification, roadmap, current-status, and restart-context
  documentation

Decisions:

- Task 27.2 adds no provider delivery, scheduling, campaigns, localization,
  webhooks, Flutter UI, or analytics.
- Template keys are normalized to lowercase and unique per tenant/channel.
- Template updates do not mutate historical versions, including metadata-only
  changes.
- Preview rejects missing, unknown, object, array, and null values to keep the
  rendering contract deterministic.
- The permission catalog now contains 186 permissions; the historical Task
  23.5 baseline remains 184.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npx tsc -p prisma/tsconfig.seed.json --noEmit`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run test -- --runInBand`: passed, 179 tests
- `npm run test:e2e -- --runInBand`: passed, 7 tests
- Focused communication template tests: passed, 10 tests
- `git diff --check`: passed
- `npm run prisma:migrate:deploy`: failed with the existing local Prisma
  schema-engine error before migration deployment

Known limitations:

- The new migration was not deployed to local PostgreSQL because Prisma's
  schema engine fails before applying migrations in the current environment.
- Delivery providers and workers remain absent until their dedicated tasks.
- Template administration UI remains deferred to Task 27.8.

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

## Task 29.1 Completion

Date: 2026-06-14

Task: Task 29.1 - Discount Policy Foundation

Status: Complete

Files changed:

- `backend/api/prisma/schema.prisma`
- `backend/api/prisma/migrations/20260615180000_add_promotions_discount_policy_foundation/migration.sql`
- `backend/api/prisma/seeds/006-permissions.seed.ts`
- `backend/api/prisma/seeds/007-role-permissions.seed.ts`
- `backend/api/src/app.module.ts`
- `backend/api/src/modules/promotions/controllers/promotions.controller.ts`
- `backend/api/src/modules/promotions/dto/discount-calculation.dto.ts`
- `backend/api/src/modules/promotions/dto/discount-policy.dto.ts`
- `backend/api/src/modules/promotions/promotions.module.ts`
- `backend/api/src/modules/promotions/promotions-schema.spec.ts`
- `backend/api/src/modules/promotions/services/discount-policies.service.ts`
- `backend/api/src/modules/promotions/services/discount-policies.service.spec.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.spec.ts`
- `docs/specifications/promotions-module.md`
- `docs/tasks/029-promotions/29.1-discount-policy-foundation.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/TASK_LOG.md`
- `docs/tasks/000-roadmap.md`

Decisions:

- Task 29.1 implemented only discount policy foundation scope.
- Coupons, campaigns, eligibility UI, redemption tracking, and promotions admin
  UI remain deferred.
- Discount policy records are tenant-scoped and optionally outlet-scoped.
- Discount application records are immutable snapshots and do not mutate bill or
  order totals in this task.
- Discount calculation supports deterministic percentage basis points and fixed
  minor-unit amounts.
- Manual arbitrary discounts require override permission; cashiers can apply
  approved policies but cannot create ad hoc overrides.
- RBAC seed entries use existing lowercase dot-key convention:
  `promotions.read`, `promotions.policy_manage`,
  `promotions.apply_discount`, and `promotions.override_discount`.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run test -- --runInBand`: passed, 84 suites and 287 tests
- `npm run build`: passed
- `npm run lint`: passed

Known limitations:

- Migrations were not deployed to a live PostgreSQL database in this task.
- Live RLS and trigger behavior still require valid local database credentials
  and migration deployment.

Next task:

- Task 29.2 - Coupon Management

## Task 29.2 Completion

Date: 2026-06-14

Task: Task 29.2 - Coupon Management

Status: Complete

Files changed:

- `backend/api/prisma/schema.prisma`
- `backend/api/prisma/migrations/20260615200000_add_coupon_management/migration.sql`
- `backend/api/prisma/seeds/006-permissions.seed.ts`
- `backend/api/prisma/seeds/007-role-permissions.seed.ts`
- `backend/api/src/modules/promotions/controllers/promotions.controller.ts`
- `backend/api/src/modules/promotions/dto/coupon.dto.ts`
- `backend/api/src/modules/promotions/promotions.module.ts`
- `backend/api/src/modules/promotions/promotions-schema.spec.ts`
- `backend/api/src/modules/promotions/services/coupons.service.ts`
- `backend/api/src/modules/promotions/services/coupons.service.spec.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.spec.ts`
- `docs/specifications/promotions-module.md`
- `docs/tasks/029-promotions/29.2-coupon-management.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/TASK_LOG.md`
- `docs/tasks/000-roadmap.md`

Decisions:

- Task 29.2 implemented only coupon definition CRUD, read-only validation,
  status management, and usage-limit foundation.
- Coupon validation does not create redemption records and does not increment
  usage counters; redemption remains Task 29.5.
- Coupon codes are normalized to uppercase and unique per tenant.
- Coupons are tenant-scoped with optional outlet scope.
- Coupon types include percentage, fixed amount, free item, category, and item.
- Optional menu category/item/free-item references were added for future
  eligibility evaluation, without implementing the eligibility engine.
- RBAC seed entries use existing lowercase dot-key convention:
  `promotions.coupon_view`, `promotions.coupon_manage`, and
  `promotions.coupon_validate`.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run test -- --runInBand`: passed, 85 suites and 292 tests
- `npm run build`: passed
- `npm run lint`: passed
- `npm run test:e2e -- --runInBand`: passed, 2 suites and 7 tests

Known limitations:

- Migrations were not deployed to a live PostgreSQL database in this task.
- Live RLS and constraint behavior still require valid local database
  credentials and migration deployment.
- Per-customer usage limits are stored as coupon constraints but cannot be
  consumed until redemption tracking is implemented.

Next task:

- Task 29.3 - Promotion Campaigns

## Task 29.3 Completion

Date: 2026-06-14

Task: Task 29.3 - Promotion Campaigns

Status: Complete

Files changed:

- `backend/api/prisma/schema.prisma`
- `backend/api/prisma/migrations/20260615220000_add_promotion_campaigns/migration.sql`
- `backend/api/prisma/seeds/006-permissions.seed.ts`
- `backend/api/prisma/seeds/007-role-permissions.seed.ts`
- `backend/api/src/modules/promotions/controllers/promotions.controller.ts`
- `backend/api/src/modules/promotions/dto/promotion-campaign.dto.ts`
- `backend/api/src/modules/promotions/promotions.module.ts`
- `backend/api/src/modules/promotions/promotions-schema.spec.ts`
- `backend/api/src/modules/promotions/services/promotion-campaigns.service.ts`
- `backend/api/src/modules/promotions/services/promotion-campaigns.service.spec.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.spec.ts`
- `docs/specifications/promotions-module.md`
- `docs/tasks/029-promotions/29.3-promotion-campaigns.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/TASK_LOG.md`
- `docs/tasks/000-roadmap.md`

Decisions:

- Task 29.3 implemented only campaign configuration, outlet targeting,
  activation/deactivation, rules, and read-only evaluation.
- Marketing automation, segmentation, communication sending, AI promotion
  generation, redemption tracking, eligibility UI, and admin UI remain deferred.
- Campaigns are tenant-scoped with stable per-tenant codes.
- Campaigns support all-outlet scope or selected-outlet scope through a
  tenant-aware join table.
- Managers can manage only selected-outlet campaigns for their authenticated
  outlet.
- Campaign rules support percentage, fixed amount, free item, category, and item
  promotion types.
- Evaluation returns active in-window campaigns and rule snapshots but does not
  create redemptions or mutate usage.
- RBAC seed entries use existing lowercase dot-key convention:
  `promotions.campaign_view` and `promotions.campaign_manage`.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run test -- --runInBand`: passed, 86 suites and 297 tests
- `npm run build`: passed
- `npm run lint`: passed
- `npm run test:e2e -- --runInBand`: passed, 2 suites and 7 tests

Known limitations:

- Migrations were not deployed to a live PostgreSQL database in this task.
- Live RLS and constraint behavior still require valid local database
  credentials and migration deployment.
- Campaign evaluation is read-only and does not apply discounts to bills or
  orders until future eligibility/application work is implemented.

Next task:

- Task 29.4 - Discount Eligibility Engine

## Task 29.4 Completion

Date: 2026-06-14

Task: Task 29.4 - Discount Eligibility Engine

Status: Complete

Files changed:

- `backend/api/prisma/seeds/006-permissions.seed.ts`
- `backend/api/prisma/seeds/007-role-permissions.seed.ts`
- `backend/api/src/modules/promotions/controllers/promotions.controller.ts`
- `backend/api/src/modules/promotions/dto/discount-eligibility.dto.ts`
- `backend/api/src/modules/promotions/promotions.module.ts`
- `backend/api/src/modules/promotions/services/discount-eligibility.service.ts`
- `backend/api/src/modules/promotions/services/discount-eligibility.service.spec.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.spec.ts`
- `docs/specifications/promotions-module.md`
- `docs/tasks/029-promotions/29.4-discount-eligibility-engine.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/TASK_LOG.md`
- `docs/tasks/000-roadmap.md`

Decisions:

- Task 29.4 implemented a central read-only eligibility engine only.
- The engine evaluates tenant/outlet-scoped discount policies, requested coupon
  codes, and active in-window campaign rules.
- Eligibility context accepts tenant, outlet, customer, order, bill, item,
  category, evaluated time, payment method, and customer type inputs.
- Customer, order, bill, and outlet references are checked under the tenant
  database request context.
- Denied discounts return explicit reasons such as `NOT_FOUND`, `INACTIVE`,
  `EXPIRED`, `CURRENCY_MISMATCH`, `MINIMUM_SUBTOTAL_NOT_MET`,
  `ITEM_NOT_PRESENT`, and `CATEGORY_NOT_PRESENT`.
- Missing requested coupon codes are returned as rejected coupon candidates
  rather than disappearing from the response.
- Stacking is intentionally conservative for the foundation:
  `BEST_SINGLE_DISCOUNT` selects the highest-value eligible candidate and marks
  the remaining eligible candidates with `STACKING_CONFLICT`.
- The endpoint does not create redemption records, mutate usage counters, add
  UI, perform segmentation, or start marketing automation.
- Added `promotions.eligibility_evaluate` to the permission seed catalog and
  operational role mappings.

Validation:

- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run build`: passed
- `npm test -- --runInBand src/modules/promotions/services/discount-eligibility.service.spec.ts src/modules/promotions/services/promotions-access.util.spec.ts`: passed, 2 suites and 13 tests
- `npm run lint`: passed
- `npm test -- --runInBand`: passed, 87 suites and 302 tests
- `npm run test:e2e -- --runInBand`: passed, 2 suites and 7 tests
- `git diff --check`: passed with line-ending warnings only

Known limitations:

- Per-customer coupon usage limits still require Task 29.5 redemption tracking
  before they can be consumed or counted.
- The stacking model is deliberately conservative and can be expanded after
  redemption/application data exists.
- No live PostgreSQL migration deployment was performed; this task did not add
  new database tables or migrations.

Next task:

- Task 29.5 - Redemption and Usage Tracking

## Task 29.5 Completion

Date: 2026-06-14

Task: Task 29.5 - Redemption and Usage Tracking

Status: Complete

Files changed:

- `backend/api/prisma/schema.prisma`
- `backend/api/prisma/migrations/20260616000000_add_promotion_redemptions/migration.sql`
- `backend/api/prisma/seeds/006-permissions.seed.ts`
- `backend/api/prisma/seeds/007-role-permissions.seed.ts`
- `backend/api/src/modules/promotions/controllers/promotions.controller.ts`
- `backend/api/src/modules/promotions/dto/promotion-redemption.dto.ts`
- `backend/api/src/modules/promotions/promotions.module.ts`
- `backend/api/src/modules/promotions/promotions-schema.spec.ts`
- `backend/api/src/modules/promotions/services/discount-eligibility.service.ts`
- `backend/api/src/modules/promotions/services/promotion-redemptions.service.ts`
- `backend/api/src/modules/promotions/services/promotion-redemptions.service.spec.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.ts`
- `backend/api/src/modules/promotions/services/promotions-access.util.spec.ts`
- `docs/specifications/promotions-module.md`
- `docs/tasks/029-promotions/29.5-redemption-and-usage-tracking.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/TASK_LOG.md`
- `docs/tasks/000-roadmap.md`

Decisions:

- Task 29.5 implemented only redemption and usage tracking scope.
- Added tenant-scoped `PromotionRedemption` records for coupons, campaign
  rules, and discount policies.
- Redemptions are append-only through PostgreSQL no-update/no-delete triggers.
- Redemptions use tenant-scoped idempotency keys and request fingerprints.
- Redemption creation reuses the Task 29.4 eligibility engine inside the same
  transaction with default policy/campaign discovery disabled, so only the
  requested source is evaluated.
- Coupon redemption enforces total usage limits and per-customer usage limits
  before writing the redemption.
- Coupon usage count increments after successful redemption creation.
- Bill, order, customer, coupon, campaign, rule, and discount policy references
  use tenant-aware foreign keys.
- Added read/create permissions:
  `promotions.redemption_view` and `promotions.redemption_create`.
- Added protected APIs:
  `POST /promotions/redemptions`,
  `GET /promotions/redemptions`, and
  `GET /promotions/redemptions/:id`.
- Refunds intentionally do not mutate or delete redemption history.
- Loyalty wallet liability, referral rewards, promotions admin UI, and advanced
  campaign analytics remain deferred.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm run build`: passed
- `npm test -- --runInBand src/modules/promotions/services/promotion-redemptions.service.spec.ts src/modules/promotions/services/promotions-access.util.spec.ts src/modules/promotions/promotions-schema.spec.ts`: passed, 3 suites and 21 tests
- `npm run lint`: passed
- `npm test -- --runInBand`: passed, 88 suites and 308 tests
- `npm run test:e2e -- --runInBand`: passed, 2 suites and 7 tests
- `git diff --check`: passed with line-ending warnings only

Known limitations:

- Migration was committed but not deployed to a live PostgreSQL database in this
  task.
- Live RLS, append-only triggers, and tenant-aware foreign keys require valid
  local database credentials and migration deployment.
- Campaign analytics beyond usage history remain out of scope.

Next task:

- Task 29.6 - Promotions Admin UI

## Task 29.6 Completion

Date: 2026-06-14

Task: Task 29.6 - Promotions Admin UI

Status: Complete

Files changed:

- `packages/shared_models/lib/restaurant_pos_shared_models.dart`
- `packages/shared_models/lib/src/promotions/promotions_models.dart`
- `packages/api_client/lib/restaurant_pos_api_client.dart`
- `packages/api_client/lib/src/api_endpoints.dart`
- `packages/api_client/lib/src/services/promotions_api_service.dart`
- `apps/admin/lib/app.dart`
- `apps/admin/lib/features/promotions/domain/promotions_query.dart`
- `apps/admin/lib/features/promotions/data/promotions_repository.dart`
- `apps/admin/lib/features/promotions/presentation/providers/promotions_providers.dart`
- `apps/admin/lib/features/promotions/presentation/screens/promotions_admin_screen.dart`
- `docs/specifications/promotions-module.md`
- `docs/tasks/029-promotions/29.6-promotions-admin-ui.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/TASK_LOG.md`
- `docs/tasks/000-roadmap.md`

Decisions:

- Task 29.6 implemented only promotions administration UI and the shared Dart
  contracts/client needed by that UI.
- Added typed shared models for discount policies, coupons, campaigns, rules,
  eligibility candidates, eligibility responses, and promotion redemptions.
- Added a typed `PromotionsApiService` over the existing backend routes.
- Added admin Riverpod providers and repository wrappers; widgets do not call
  Dio directly.
- Added an authorized `Promotions` navigation destination for super admins,
  tenant admins, and users with relevant lowercase `promotions.*` permissions.
- The Promotions Center includes dashboard metrics, policy management, coupon
  management, campaign lifecycle actions, discount eligibility preview, and
  redemption history.
- Campaign creation is deliberately minimal: all-outlet scope with one initial
  rule. Marketing automation, communication composition, AI offer generation,
  and advanced analytics remain out of scope.

Validation:

- `dart format` on changed Dart files: passed
- `dart analyze` from `packages/shared_models`: passed
- `dart analyze` from `packages/api_client`: passed
- `flutter pub get` from `apps/admin`: passed
- `flutter analyze` from `apps/admin`: passed
- `flutter test` from `apps/admin`: passed, 2 tests
- `git diff --check`: passed with line-ending warnings only

Known limitations:

- Backend and Prisma were not changed in this task, so Prisma and NestJS
  validation were not rerun.
- The dashboard's "today" discount metric is calculated from the current
  redemption history page because the existing redemption API does not expose
  date-range filtering.
- Live UI behavior still depends on the Task 29 backend migrations being
  deployed to a PostgreSQL database.

Next task:

- Task 30 - Tax Configuration and Fiscal Policy Administration

## Task 30.1 Completion

Date: 2026-06-14

Task: Task 30.1 - Tax Foundation

Status: Complete

Files changed:

- `backend/api/prisma/schema.prisma`
- `backend/api/prisma/migrations/20260616020000_add_tax_foundation/migration.sql`
- `backend/api/prisma/seeds/006-permissions.seed.ts`
- `backend/api/prisma/seeds/007-role-permissions.seed.ts`
- `backend/api/src/app.module.ts`
- `backend/api/src/modules/tax/controllers/tax-profiles.controller.ts`
- `backend/api/src/modules/tax/dto/tax-profile.dto.ts`
- `backend/api/src/modules/tax/services/tax-access.util.ts`
- `backend/api/src/modules/tax/services/tax-access.util.spec.ts`
- `backend/api/src/modules/tax/services/tax-profiles.service.ts`
- `backend/api/src/modules/tax/services/tax-profiles.service.spec.ts`
- `backend/api/src/modules/tax/tax-schema.spec.ts`
- `backend/api/src/modules/tax/tax.module.ts`
- `docs/specifications/tax-module.md`
- `docs/tasks/030-tax/30.1-tax-foundation.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/TASK_LOG.md`
- `docs/tasks/000-roadmap.md`

Decisions:

- Task 30.1 implemented only the tax foundation scope.
- Added tenant-scoped `TaxProfile` records with `TaxType`, `TaxMode`, and
  `TaxProfileStatus`.
- Added forced RLS and tenant-aware unique constraints for `tax_profiles`.
- Added a partial unique index so each tenant can have at most one active
  default tax profile.
- Tax profile mutations use optimistic `version` checks.
- Default profile changes clear any previous tenant default in the same locked
  transaction.
- Added protected APIs:
  `POST /tax/profiles`,
  `GET /tax/profiles`,
  `GET /tax/profiles/default`,
  `GET /tax/profiles/:id`, and
  `PATCH /tax/profiles/:id`.
- Added lowercase RBAC permissions:
  `tax.read`, `tax.profile_manage`, `tax.policy_manage`, and
  `tax.report_view`.
- Added audit events for tax profile creation and update.
- Tax rates, tax groups, tax rules, fiscal policy, invoice sequencing,
  calculation, reporting, shared Dart clients, and UI remain deferred.

Validation:

- `npm run prisma:format`: passed
- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed
- `npm test -- --runInBand src/modules/tax/tax-schema.spec.ts src/modules/tax/services/tax-access.util.spec.ts src/modules/tax/services/tax-profiles.service.spec.ts`: passed, 3 suites and 9 tests
- `npm run lint`: passed
- `npm run build`: passed
- `npm test -- --runInBand`: passed, 91 suites and 317 tests
- `npm run test:e2e -- --runInBand`: passed, 2 suites and 7 tests
- `git diff --check`: passed with line-ending warnings only

Known limitations:

- The Task 30.1 migration was not deployed to a live PostgreSQL database.
- Live RLS and partial unique index behavior require valid local database
  credentials and migration deployment.
- Tax rates, rules, fiscal invoice policy, tax calculation snapshots, reports,
  and UI are not implemented in this task.

Next task:

- Task 30.2 - Tax Rules and Rates
