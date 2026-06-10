# Development Rules

## 1. Contract-First Delivery

Backend/API contracts must be designed before Flutter screens.

Before implementing a feature UI, define:

- Business behavior and invariants
- Tenant and outlet ownership
- Database entities and constraints
- Permission requirements
- Request and response DTOs
- Validation and error behavior
- Idempotency and concurrency behavior
- Tests for the backend contract

Do not invent a temporary frontend contract that bypasses the backend design.

## 2. Scope and Change Control

- Work only on the active task.
- Do not implement future tasks opportunistically.
- Do not rename `restaurant-pos`.
- Do not delete or reorganize existing modules as incidental cleanup.
- Preserve uncommitted user work.
- Avoid unrelated formatting, dependency, and metadata churn.
- Record architecture changes in documentation and `TASK_LOG.md`.

## 3. Backend Structure

The initial backend is a modular NestJS monolith.

- Keep controllers thin.
- Put validation at transport boundaries.
- Put authorization and use-case orchestration in application services.
- Keep core invariants independent of HTTP and Flutter.
- Access PostgreSQL through Prisma-backed infrastructure.
- Keep transactions around complete business operations.
- Do not expose Prisma records as long-term public API contracts by default.
- Use explicit DTOs for API input and output.
- Return stable machine-readable error codes where clients need branching.

Do not add microservices, Docker, Kubernetes, Redis, queues, or cloud services
without an explicit task and documented operational need.

## 4. Database and Prisma

- PostgreSQL is the source of truth.
- Prisma schema changes require a reviewed migration strategy.
- Every tenant-owned model includes `tenantId`.
- Tenant-owned unique constraints begin with tenant scope.
- Use tenant-aware composite relations where practical.
- Never trust a payload-provided tenant ID as authorization context.
- Use database constraints for invariants that must survive application bugs.
- Use `timestamptz` semantics and UTC instants.
- Use integer minor units for money; never use floating point.
- Use explicit precision for inventory quantities.
- Use optimistic versions for mutable aggregates that can be edited offline.
- Use append-only ledgers/events for financial, stock, loyalty, fiscal, and audit
  history.
- Use compensating entries for corrections.
- Avoid destructive cascade deletion of transactional history.
- Plan row-level security for tenant tables.

Migration names should describe the domain change. Production changes must use
committed migrations, not schema pushing.

## 5. Authentication and Authorization

- JWT is planned but not implemented yet.
- Authentication establishes user identity and trusted tenant context.
- A global user account may belong to multiple tenants.
- Authorization is resolved from tenant membership, roles, permissions, and
  outlet scope.
- Platform super-admin access must not be represented as an ordinary tenant
  role.
- Impersonation must be explicit, limited, and fully audited.
- Backend authorization is mandatory for every protected action.
- Client-side guards only control navigation and presentation.

## 6. API Contracts

- Version HTTP endpoints under the configured API prefix.
- Validate all external input.
- Use consistent pagination, filtering, sorting, and error envelopes.
- Make retryable commands idempotent.
- Require idempotency keys for payments and offline command submission.
- Define optimistic concurrency behavior for mutable aggregates.
- Avoid leaking database errors, secrets, or stack traces.
- Update Swagger and `docs/api` when contracts are introduced or changed.

## 7. Flutter and Shared Packages

Use Flutter, Flutter Web, Riverpod, Dio, SQLite, and GoRouter.

- Organize applications by feature.
- Widgets consume state and issue intents; they do not access transports or
  databases directly.
- Repositories hide Dio, SQLite, Firebase, and other infrastructure.
- Domain contracts must not depend on Flutter.
- Features must not import another feature's presentation code.
- Shared packages must never import application code.
- Keep application-specific widgets inside the owning application.
- Place genuinely reusable presentation components in `ui_kit`.
- Place stable cross-application models in `shared_models`.
- Place transport behavior and generated clients in `api_client`.

Any temporary Firebase behavior is an implementation detail, not the target
identity architecture.

## 8. Offline and Realtime Behavior

- SQLite is the restaurant app's local operational store.
- Local changes and pending operations must be written atomically.
- Every submitted operation has a unique operation ID.
- Commands carry the expected aggregate version when needed.
- Server responses distinguish accepted, duplicate, conflicted, and rejected
  operations.
- Synchronization uses resumable ordered cursors.
- Socket.IO, when introduced, accelerates updates but does not replace durable
  sync.
- External payments and fiscal numbering remain server-authoritative.

## 9. Security and Privacy

- Never commit secrets or production credentials.
- Keep real `.env` files untracked.
- Redact secrets and sensitive customer data from logs.
- Encrypt sensitive fields where required and store normalized lookup hashes
  separately when search is needed.
- Use least-privilege database and application credentials.
- Audit privileged actions and security-sensitive business changes.
- Do not weaken CORS, validation, or authorization for development convenience.

## 10. Testing

Tests should scale with risk.

Backend features should include:

- Unit tests for domain rules and application services
- Integration tests for Prisma constraints and transactions when relevant
- End-to-end tests for public API behavior
- Tenant-isolation and authorization tests
- Idempotency and concurrency tests for retryable operations

Flutter features should include:

- Unit tests for domain and state behavior
- Repository tests for transport and persistence mapping
- Widget tests for important user flows
- Offline/retry tests where applicable

## 11. Validation Commands

Backend from `backend/api`:

```powershell
npm run lint
npm run build
npm run test
npm run test:e2e
npm run prisma:format
npm run prisma:validate
```

Flutter:

```powershell
flutter pub get
flutter analyze
flutter test
```

Run only destructive or database-changing commands when the active task requires
them and the target environment is understood. State clearly which checks ran
and which did not.

## 12. Documentation and Task Handoff

At the end of substantive work:

1. Update relevant architecture, API, database, or business-rule documents.
2. Update `docs/ai/TASK_LOG.md`.
3. Record validation results and limitations.
4. State the exact next task without implementing it.
5. Keep `docs/ai/CODEX_START_PROMPT.md` usable for a fresh conversation.

