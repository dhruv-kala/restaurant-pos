# Repository Architecture Audit

Audit date: 2026-06-10  
Scope: Entire repository, with implementation analysis focused on
`apps/pos-app` (formerly `mobile-app/restaurantpos`)

## Executive Summary

The repository currently contains:

- A Flutter UI prototype with Firebase authentication.
- Empty placeholders for the NestJS API and administrative web application.
- An enterprise target-system design, but no backend implementation.

Before this refactor, 1,873 of the 2,556 Dart source lines were concentrated in
three role screens. Those screens combine sample data, mutable state, business
calculations, navigation chrome, and presentation. Authentication directly used
Firebase Auth and Firestore from a widget and selected screens through imperative
navigation.

This change establishes the first safe architecture boundary:

- Feature-first folders.
- Central application bootstrap and declarative routing.
- Authentication split into data, domain, and presentation layers.
- Repository and use-case abstractions.
- Unit tests for authentication domain/controller behavior.
- Removal of files proven empty or unreachable.

The admin, cashier, and waiter screens are deliberately preserved visually and
behaviorally. Their internal decomposition remains the next major refactor.

## Current Architecture

### Repository layout

```text
apps/pos-app/                Flutter prototype
apps/admin-panel/            README placeholder only
backend/api/                 README placeholder only
docs/                        Product and architecture documents
```

### Flutter modules before refactoring

| Area | State |
|---|---|
| Bootstrap | Firebase initialization and app widget in `main.dart` |
| Routing | Imperative `Navigator.pushReplacement` in login |
| Authentication | Firebase Auth and Firestore called from `LoginScreen` |
| State management | Local `setState`; Provider dependency was unused |
| Data models | Private UI-local classes in role screens |
| Services | Three zero-byte service files |
| Database/offline | No SQLite or repository implementation |
| API | No HTTP client or backend API layer |
| Tests | No Dart unit, widget, or integration tests |
| Shared UI | One unused shell plus three duplicated private sidebars |

### Existing strengths

- The prototype demonstrates distinct admin, cashier, and waiter experiences.
- UI-local models are immutable.
- Widgets generally use `const` where practical.
- Firebase initialization uses generated platform options rather than manual
  runtime string assembly.
- The repository already has a detailed target-system design.

## Findings by Severity

### Critical

#### C1. Client-side role documents are treated as authorization

The login flow reads `users/{uid}.role` and chooses a screen. This is acceptable
only as UI routing. Firestore Security Rules must independently enforce every
resource operation. The long-term NestJS backend must derive tenant membership,
role, permissions, and outlet scope from server-controlled records.

Risk: privilege escalation or cross-tenant access if UI role checks are mistaken
for security controls.

#### C2. No tenant context exists

There is no tenant or outlet identity in authentication, repositories, queries,
cache keys, or data models.

Risk: the current data access pattern cannot safely evolve into a multi-tenant
SaaS without introducing tenant boundaries first.

#### C3. No offline database or synchronization layer exists

The required SQLite store, operation queue, idempotency keys, sync cursor, and
conflict handling are absent.

Risk: the prototype cannot meet the core offline POS requirement.

### Major

#### M1. Three god screens

- Admin screen: approximately 619 lines.
- Cashier screen: approximately 630 lines.
- Waiter screen: approximately 624 lines.

Each owns data, state, calculations, navigation, and many child widgets.

#### M2. Business logic is embedded in presentation

Cashier subtotal, GST, service-charge, cart mutation, filtering, and menu data
live in widget state. Waiter status/actions and table/order data are also
presentation-owned.

Risk: rules are difficult to test, reuse, version, or reconcile offline.

#### M3. Duplicated application shell

Sidebar/navigation classes and styling are copied into all role screens. Sidebar
selection changes visual state but does not navigate.

Risk: inconsistent fixes and misleading UI behavior.

#### M4. No repository or data-source boundary outside authentication

Orders, menu, tables, inventory, reports, and settings have no contracts or
implementations. The empty service files gave only the appearance of layering.

#### M5. Monetary calculations use `double`

The cashier uses floating-point arithmetic for taxes and totals.

Risk: rounding errors in financial operations. Use integer minor units in domain
entities and explicit rounding rules.

#### M6. Static sample state masquerades as operational data

Menu, revenue, table, inventory, order, and staff values are hardcoded inside
screens. Buttons frequently have empty callbacks.

Risk: UI behavior cannot be distinguished from implemented workflows.

#### M7. No tests

There was no protection for authentication, cart totals, role routing, or UI
behavior.

### Minor

- Generated mojibake appears in comments and currency/multiplication strings.
- Theme constants are duplicated instead of using a design-token layer.
- Old `withOpacity` calls are deprecated on current Flutter versions.
- The original login did not dispose text controllers or check `mounted` after
  asynchronous work.
- Debug `print` calls exposed identity/profile information.
- `flutter_svg`, `google_fonts`, and initially `go_router`/`provider` were unused.
- Package description and README were still Flutter template defaults.
- Empty feature files and an unreachable duplicate dashboard increased noise.

## Refactoring Applied

### File migration

| Previous path | New path |
|---|---|
| `lib/screens/admin/admin_screen.dart` | `lib/features/admin/presentation/screens/admin_screen.dart` |
| `lib/screens/cashier/cashier_screen.dart` | `lib/features/pos/presentation/screens/cashier_screen.dart` |
| `lib/screens/waiter/waiter_screen.dart` | `lib/features/service/presentation/screens/waiter_screen.dart` |
| `lib/screens/auth/login_screen.dart` | Replaced by layered files under `lib/features/auth` |
| `lib/main.dart` | Reduced to calling `bootstrap()` |

Removed:

- Zero-byte services and feature screens.
- Zero-byte custom button.
- Unreachable duplicate dashboard and its private shell widgets.

### Authentication dependency flow

```text
LoginScreen
  -> LoginController
    -> SignIn use case
      -> AuthRepository contract
        <- FirebaseAuthRepository
          -> FirebaseAuthDataSource
            -> Firebase Auth + Firestore
```

Firebase exceptions are translated at the data boundary. The presentation layer
receives domain-safe messages and roles only.

### Routing

`go_router` now owns `/login`, `/admin`, `/pos`, and `/service`. Role-to-route
mapping remains presentation policy for now. Route guards and session restoration
must be added with the backend identity migration.

## Target Flutter Structure

```text
lib/
  app/
    app.dart
    router/
  core/
    config/
    database/
    errors/
    network/
    security/
    sync/
    theme/
    telemetry/
  shared/
    domain/
    presentation/
      layouts/
      widgets/
  features/
    auth/
    admin/
    menu/
    orders/
    inventory/
    customers/
    payments/
    reports/
    settings/
    kitchen/
    tables/
    loyalty/
    workforce/
```

Every business feature should use:

```text
feature/
  data/
    datasources/
    models/
    repositories/
  domain/
    entities/
    repositories/
    usecases/
  presentation/
    controllers/
    screens/
    widgets/
```

Use domain entities only where behavior or invariants exist. Do not create
one-line use cases mechanically for simple read-only delegation.

## State Management Recommendation

### Current decision

Provider remains temporarily for dependency injection and the small
`LoginController`. This uses an existing dependency and limits migration risk.

### Target decision

Adopt Riverpod when implementing SQLite and the first real feature repository.
Riverpod is preferable here because it provides:

- Compile-time provider references without `BuildContext`.
- Testable dependency overrides.
- Async state and lifecycle handling.
- Suitable scoping for tenant, outlet, session, and device dependencies.
- Less reliance on widget-tree placement for enterprise dependency graphs.

Migration sequence:

1. Keep `LoginController` behavior stable.
2. Add Riverpod only when the offline data layer begins.
3. Expose database, API client, session, and repositories as providers.
4. Migrate one vertical slice, preferably menu catalog.
5. Remove Provider after all consumers migrate.

Bloc is also viable but adds event/state ceremony that is not currently justified.

## Dependency Review

| Package | Assessment |
|---|---|
| `firebase_core` | Used; temporary until NestJS authentication migration |
| `firebase_auth` | Used behind the new data source |
| `cloud_firestore` | Used only for temporary role profile lookup |
| `go_router` | Now used for central routing |
| `provider` | Now used for controller injection; migration bridge |
| `flutter_svg` | Removed because no SVG assets use it |
| `google_fonts` | Removed because the application uses the platform/theme fonts |

Future dependencies should be introduced with the feature that uses them:

- Riverpod for target state/dependency management.
- Drift and SQLite for local persistence.
- Dio for API transport and interceptors.
- Freezed/json serialization only when DTO volume justifies generation.
- Secure storage for refresh/device credentials.

Do not update package major versions during architecture refactoring unless an
existing version blocks validation. Dependency upgrades need a separate,
test-backed change.

## Database and API Review

No client database or HTTP API exists. The required target is:

- UI reads reactive local projections from Drift/SQLite.
- Commands update SQLite and append an operation in one transaction.
- A sync worker pushes idempotent operations and pulls changes by cursor.
- Repositories coordinate local and remote data sources.
- Widgets never call Dio, SQLite, Firebase, or Socket.IO directly.
- Tenant/outlet context is mandatory in session state and server authorization.

Firebase should be treated as temporary prototype infrastructure, not the
enterprise system of record described in the system design.

## Security Review

### Found

- Firebase project identifiers and API keys are committed in generated files.
  Firebase API keys are client identifiers, not server secrets, but they require
  restricted APIs, authorized origins/apps, App Check where appropriate, and
  strict Security Rules.
- Android Firebase configuration is committed.
- The previous login printed UID, email, role, and entire profile documents.
- No secure token storage, session restoration, MFA, tenant selection, or outlet
  authorization exists.

### Required

- Remove PII logging and use redacted structured telemetry.
- Validate Firestore rules immediately while Firebase remains active.
- Move to NestJS-issued short-lived access tokens and rotating refresh tokens.
- Store refresh/device secrets in platform secure storage.
- Enforce authorization on the server; client checks only control visibility.
- Add tenant and outlet context to every repository request.
- Add certificate/domain configuration per environment; never hardcode backend
  secrets into Flutter.

## Performance Review

- `setState` rebuilds entire role screens for small changes such as cart quantity
  or selected table.
- Shrink-wrapped grids inside scroll views build all items.
- Hardcoded sample collections are small, hiding future list-performance issues.
- Repeated private shell widgets inflate code and maintenance cost.
- No pagination, query indexing, image caching policy, or socket lifecycle exists.

Recommended corrections:

- Move cart/order/table state into scoped controllers/providers.
- Select only the state fragments required by each widget.
- Use lazy slivers for large catalogs and operational lists.
- Use stable IDs and keys instead of object identity for cart lines.
- Move totals to pure domain value objects using minor units.
- Profile with Flutter DevTools before adding speculative caching.

## Testing Strategy

### Added

- Role parsing tests.
- Sign-in validation/delegation tests.
- Login-controller success and error tests.

### Next tests

1. Widget tests for login validation, loading, errors, and role navigation.
2. Pure unit tests for money, tax, discount, and cart invariants.
3. Repository contract tests using fake local/remote data sources.
4. Drift migration and transaction tests.
5. Sync tests for duplicate operations, conflicts, cursor resume, and retries.
6. Golden tests for core responsive layouts.
7. Integration tests for offline sale, reconnect, payment reconciliation, and
   role/outlet authorization.
8. Automated cross-tenant denial tests against the NestJS API.

## Step-by-Step Refactoring Roadmap

### Increment 1 - Completed

- Establish app/bootstrap/router boundaries.
- Introduce feature-first structure.
- Layer authentication.
- Remove proven dead/empty files.
- Add foundational unit tests.

### Increment 2 - Shared application shell (partially completed)

- Extracted sidebar and navigation item model.
- Extract `AppShell`, top bar, and remaining design tokens.
- Wire navigation to real routes.
- Add responsive desktop/tablet breakpoints.
- Add session-aware logout.

### Increment 3 - POS domain slice (partially completed)

- Extracted `MenuItem`, `CartTotals`, tax/service rules, and stable ID quantities.
- Added `PosController` and exact calculation tests.
- Extract `Money`, `Cart`, `CartLine`, and discount rules as workflows expand.
- Split cashier screen into catalog, cart, totals, and action widgets.

### Increment 4 - Tables and service

- Extract table/order entities and status transitions.
- Add table and order repository contracts.
- Split waiter screen into table overview and active-order components.
- Add optimistic concurrency behavior.

### Increment 5 - Local-first data

- Add Drift schema, migrations, repository implementations, operation queue, and
  sync status.
- Implement catalog snapshot and order operation synchronization.
- Encrypt or protect local credentials and sensitive cached data.

### Increment 6 - Backend migration

- Implement NestJS authentication, tenant selection, RBAC, and outlet scope.
- Replace Firebase repository with an API implementation behind the existing
  domain contract.
- Remove Firebase dependencies and generated configuration after cutover.

### Increment 7 - Remaining modules

- Implement inventory, kitchen, customers, payments, loyalty, reports, and
  settings as vertical slices.
- Extract admin dashboard data into query repositories and view models.
- Add observability, feature flags, and entitlement checks.

## Architectural Decisions

- Feature-first organization is used because changes occur by business capability.
- Clean boundaries begin at external systems and business invariants; they are
  not a mandate to create unnecessary classes for every function.
- The Firebase implementation is isolated so it can be replaced without changing
  the login UI or use case.
- Existing role screens are moved before decomposition to preserve behavior and
  keep reviewable increments.
- Dead files are removed rather than retained as speculative architecture.
- State-management migration is deferred until a real repository/offline slice
  can prove the target pattern end to end.
