# Project Context

## Project Identity

Repository root: `restaurant-pos`

The repository implements a multi-tenant Restaurant POS SaaS and Restaurant
Operating System. It is intended to support day-to-day restaurant operations,
restaurant-owner administration, SaaS platform administration, and
customer-facing loyalty and ordering.

The working product name `ServeIQ` appears in existing documentation and package
names. The canonical repository name remains `restaurant-pos`.

## Product Vision

The system will provide:

- Point of sale, billing, payments, and fiscal records
- Waiter, table, kitchen, and manager workflows
- Menu, pricing, tax, inventory, and outlet operations
- Customer profiles, loyalty, rewards, wallet, and referrals
- Multi-outlet tenant administration and analytics
- SaaS tenant, subscription, support, impersonation, and platform operations
- Offline-capable restaurant operation with reliable synchronization

The first deployment must remain operationally simple and cost-efficient while
preserving domain boundaries that allow later scaling.

## Application Responsibilities

### `apps/restaurant-app`

Role-based operational application for:

- POS and cashier users
- Waiters
- Kitchen staff
- Outlet managers

Target capabilities include orders, tables, kitchen flow, payments, inventory,
shifts, device-aware sessions, and SQLite-backed offline operation.

### `apps/admin`

Restaurant owner and tenant administrator web portal for:

- Outlets
- Employees and access
- Menu, pricing, and taxes
- Inventory
- Customers and loyalty
- Reports and multi-outlet dashboards

### `apps/super-admin`

SaaS owner portal for:

- Tenant lifecycle management
- Subscription and entitlement management
- Support and audited impersonation
- Feature controls
- Platform analytics

### `apps/customer`

Customer-facing application for:

- Ordering
- Loyalty points and rewards
- Wallet and gift cards
- Referrals
- Personalized offers

## Repository Direction

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

An additional `apps/kitchen-display` scaffold currently exists as a reserved
future application. Its presence does not change the four primary application
responsibilities above. Do not remove it without a dedicated architecture task.

## Backend Direction

The backend starts as a modular NestJS monolith under `backend/api`.

Core technologies:

- NestJS
- PostgreSQL
- Prisma

Implemented backend capabilities:

- JWT access and rotating refresh authentication
- Socket.IO kitchen queue and order-status realtime updates

Planned later capabilities:

- PM2 process management
- Nginx reverse proxy and static hosting

Initial hosting:

- Ubuntu VPS
- PostgreSQL installed directly on the VPS
- Local or VPS-managed infrastructure
- No Docker
- No Kubernetes
- No mandatory cloud service

The backend module direction includes auth, tenants, outlets, users, menu,
inventory, orders, customers, loyalty, payments, reports, and subscriptions.
Modules should keep transport, application, domain, and infrastructure concerns
separate where the feature complexity justifies it.

## Frontend Direction

Primary technologies:

- Flutter
- Flutter Web
- Riverpod
- Dio
- SQLite
- GoRouter

Feature code should follow a feature-first structure with data, domain, and
presentation responsibilities. Widgets must not directly call HTTP, Firebase,
or SQLite. Shared packages must never import application code.

## Delivery Strategy

The required implementation order is:

```text
business rules
  -> domain and database contracts
  -> API contracts
  -> backend implementation and tests
  -> shared client contracts
  -> Flutter state and screens
```

Backend/API contracts first, then Flutter screens. UI-first implementation is
not an accepted shortcut.

## Multi-Tenancy

The initial database uses one shared PostgreSQL schema.

- Every tenant-owned table includes `tenant_id`.
- Tenant-owned uniqueness is scoped by `tenant_id`.
- Tenant-aware foreign keys should be used where practical.
- Trusted authentication establishes tenant context.
- Repository filtering and PostgreSQL row-level security enforce isolation.
- Outlet scope is evaluated separately from tenant membership.
- Jobs, cache keys, files, socket rooms, audit events, and integration events
  include tenant scope.

A user account is global and may have memberships in multiple tenants. Roles and
outlet access are resolved inside a tenant membership.

## Data Conventions

- Use UUIDv7 or another time-sortable UUID for primary identifiers.
- Allow client-generated IDs for offline-created aggregates.
- Store timestamps in UTC using `timestamptz`.
- Store IANA timezone identifiers for tenant and outlet configuration.
- Store money as integer minor units with ISO currency codes.
- Store inventory quantities with explicit decimal precision.
- Use aggregate versions for optimistic concurrency.
- Use effective date ranges for changing prices, tax rules, recipes, and similar
  configuration.
- Never rewrite settled financial, stock, loyalty, fiscal, or audit history.
- Use soft deletion only for suitable master data.

## Offline Direction

The restaurant application will use SQLite as its local operational store.

1. The UI reads local projections.
2. Commands update local state and append a pending operation atomically.
3. A sync worker sends operations with unique idempotency identifiers.
4. The API validates tenant context, authorization, versions, and invariants.
5. The server acknowledges or rejects operations deterministically.
6. Clients pull ordered changes using a resumable cursor.

The server remains authoritative for external payments, wallet balances, and
fiscal numbering.

## Security Direction

Planned security controls include:

- Short-lived JWT access tokens
- Rotating refresh tokens
- Secure password hashing
- Optional MFA and step-up authentication
- Tenant- and outlet-aware RBAC
- PostgreSQL row-level security
- Immutable audit events
- Idempotent financial and offline operations
- TLS, rate limiting, redacted logs, and protected sensitive fields

The backend must authorize every protected operation. Flutter role checks do not
provide security.

## Existing Foundation

The repository currently contains:

- Restructured monorepo directories
- `docs/architecture/system-overview.md`
- `docs/database/initial-erd.md`
- A NestJS base project under `backend/api`
- Environment validation, health endpoint, and Swagger foundation
- PostgreSQL/Prisma configuration
- Prisma tenant, outlet, global user, membership, role, permission, and
  outlet-scope models
- A committed tenancy and authorization migration with UUIDv7 generation,
  tenant-aware constraints, and forced row-level security
- An idempotent global permission seed
- Email/password authentication with Passport JWT
- Hashed, rotating, revocable refresh-token persistence
- Protected tenant and outlet management APIs
- Platform-admin and tenant-scoped RLS transaction context
- Tenant outlet-limit enforcement
- Standardized `restaurant_pos_*` Dart/Flutter workspace packages
- Backend-aligned auth, tenant, outlet, and pagination client models
- Dio API client configuration, interceptors, and typed auth/tenant/outlet
  services
- Shared authentication contracts, analytics contracts, utilities, themes, and
  reusable UI primitives
- Flutter secure token persistence and Riverpod authentication state
- NestJS login, session restore, refresh rotation, and logout client flows
- GoRouter authentication guards and role-based dashboard placeholders
- Tenant-scoped menu categories, items, variants, add-ons, and outlet prices
- Protected NestJS menu management APIs with pagination and forced RLS
- Flutter admin menu dashboard with Riverpod category and item management
- Outlet-scoped table sections, dining tables, reservations, and table
  operations
- Order aggregates with server pricing snapshots, lifecycle APIs, kitchen
  queue, typed clients, and restaurant-app order screens
- Tenant/outlet-scoped kitchen categories and menu-item station routing
- KDS queue, active, ready, and completed projections with priority ordering,
  search, station filters, and SLA classification
- Protected item and bulk-order kitchen transitions with role/outlet
  authorization and typed event placeholders
- Shared KDS models and API client plus Riverpod restaurant-app kitchen
  dashboard, queue, ready, and completed screens
- Tenant/outlet-scoped immutable bill, bill item, and tax snapshots
- Atomic outlet/day bill numbering, GST breakdowns, round-off, and audited
  generate, update, print, void, split, and merge workflows
- Shared billing models and API client plus Riverpod restaurant-app bill list,
  generation, detail, split, and merge screens
- Tenant/outlet-scoped idempotent payment aggregates, immutable tender
  transactions, append-only refunds, and atomic outlet/day payment numbering
- Transactional bill paid/refunded/outstanding reconciliation with partial and
  split tender support
- Shared payment models and API client plus Riverpod restaurant-app payment,
  split, refund, history, and detail screens
- Immutable receipt and tax-invoice snapshots with outlet/day receipt and
  invoice numbering, append-only print audit, PDF generation, and forced RLS
- Shared receipt models and API client plus Riverpod receipt history, detail,
  invoice preview, mock thermal printing, and PDF download flows
- First-class kitchen stations and menu-item station assignments with
  tenant/outlet ownership and forced RLS
- Station-aware order-item routing snapshots, preparation timers, transition
  actor auditing, and kitchen analytics foundations
- Protected `/kitchen` station, queue, metrics, item-status, and order-status
  APIs
- Socket.IO `/kitchen` namespace with tenant, outlet, and station rooms and
  authenticated realtime events
- Shared kitchen models, typed HTTP/socket clients, Riverpod providers, and
  restaurant-app queue, station, and analytics screens
- Tenant-scoped inventory categories, units, ingredients, and vendors
- Outlet stock balances, expiry batches, append-only stock transactions,
  adjustments, same-tenant transfers, low-stock alerts, and valuation
- Audited purchase orders with atomic outlet/day numbering and transactional
  stock receipt
- Shared inventory models, typed API client, Riverpod providers, and admin
  inventory dashboard and workflows
- Tenant-scoped menu-item/variant recipes, production recipes, yield and
  portion controls, immutable cost snapshots, and profitability calculations
- Configurable READY/COMPLETED idempotent stock consumption, append-only
  movement history, outlet negative-stock policy, and immutable wastage
- Shared recipe models, typed API client, Riverpod providers, and admin recipe
  builder, costing, profitability, consumption, and wastage screens
- Tenant-scoped customer profiles with normalized duplicate-safe contact
  lookup, addresses, consent flags, append-only notes and payment visits
- Rebuilt customer spend/repeat/favorite-outlet stats, customer-linked order
  history, typed clients, admin CRM screens, and restaurant customer lookup
- Business-date-driven sales, GST, payment, outlet, customer, inventory,
  kitchen, staff, platform, and dashboard reporting with append-only generation
  audits, typed clients, Riverpod providers, and admin report screens
- Existing-user-linked employee profiles, tenant roles, outlet assignments,
  effective shifts, attendance, operational performance projections, typed
  clients, Riverpod providers, and admin workforce screens

## Authoritative References

- `AGENTS.md`
- `docs/ai/DEVELOPMENT_RULES.md`
- `docs/ai/TASK_LOG.md`
- `docs/architecture/system-overview.md`
- `docs/database/initial-erd.md`
- `docs/specifications/enterprise-system-design.md`
- `backend/api/README.md`

When documents conflict, do not silently choose one. Prefer the latest explicit
user decision, update the affected documentation, and record the decision in the
task log.
