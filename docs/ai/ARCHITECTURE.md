# Architecture

## System Shape

Restaurant POS is a multi-tenant Restaurant Operating System implemented as a
modular monorepo:

```text
Flutter applications
  -> shared Dart contracts and Dio clients
  -> versioned NestJS API
  -> Prisma
  -> PostgreSQL with tenant-aware constraints and forced RLS
```

The initial backend is a modular monolith. Do not introduce microservices,
containers, queues, Redis, or cloud dependencies without an explicit task.

## Applications

| Application | Responsibility |
|---|---|
| `apps/restaurant-app` | POS, waiter, kitchen, cashier, and manager operations |
| `apps/admin` | Tenant administration, menu, inventory, staff, CRM, reports, and access |
| `apps/super-admin` | SaaS tenant, subscription, support, impersonation, and platform operations |
| `apps/customer` | Ordering, loyalty, wallet, rewards, and referrals |

`apps/kitchen-display` is reserved. Do not remove or expand it incidentally.

## Backend Boundaries

Backend modules live under `backend/api/src/modules`. Controllers own transport
mapping, services own authorization and use-case orchestration, Prisma owns
persistence, and transactions cover complete business operations.

The delivery direction is:

```text
business rules
  -> database ownership and invariants
  -> API DTOs and authorization
  -> backend implementation and tests
  -> shared Dart contracts and API client
  -> Riverpod state and Flutter screens
```

## Frontend Boundaries

Flutter code is feature-first:

```text
feature/
  data/
  domain/
  presentation/
```

Widgets consume providers and issue intents. They do not call Dio, SQLite, or
other infrastructure directly. Shared packages never import application code.

## Data Architecture

- PostgreSQL is authoritative.
- Tenant-owned rows carry `tenantId`.
- Outlet scope is separate from tenant isolation.
- RLS and tenant-aware foreign keys provide defense in depth.
- Financial, stock, loyalty, fiscal, and audit history is append-only.
- Offline commands use idempotency and optimistic concurrency.
- Completed commercial records retain snapshots.

## Runtime Architecture

Initial production deployment:

```text
Nginx
  -> Flutter Web
  -> NestJS API and Socket.IO under PM2
PostgreSQL installed directly on Ubuntu VPS
encrypted off-host backups
```

No Docker, Kubernetes, or required cloud service is part of the initial
architecture.

## Authoritative Detail

- `docs/architecture/system-overview.md`
- `docs/architecture/frontend-architecture.md`
- `docs/database/initial-erd.md`
- `docs/specifications/enterprise-system-design.md`

