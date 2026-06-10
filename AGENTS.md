# Restaurant POS AI Working Agreement

This file is the primary persistent context for AI coding agents working in this
repository. Read it before planning or changing code. Then read:

1. `docs/ai/PROJECT_CONTEXT.md`
2. `docs/ai/DEVELOPMENT_RULES.md`
3. `docs/ai/TASK_LOG.md`

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
- Socket.IO later
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

Tasks 1 through 8 are complete at the foundation level.

Task 8 created protected tenant and outlet APIs with platform/tenant role
boundaries, pagination, forced-RLS context, and outlet-limit enforcement.

Task 9 is next: create Flutter shared packages.
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
