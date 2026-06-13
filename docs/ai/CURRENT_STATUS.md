# Current Status

Last updated: 2026-06-13

## Current Position

- Completed through: **Task 27.2**
- Current module: **Communication Template Management**
- Next provisional task: **Task 27.3 - Email Delivery Providers**
- Later roadmap entries: **Provisional until explicitly approved**

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

## Known Environment Limitation

Committed migrations after the initial foundation have not been deployed to the
local PostgreSQL instance because recorded local credentials are invalid.
Schema validation and automated tests can run; live database behavior requires
valid credentials and migration deployment.

## Next Task

### Task 27.3 - Email Delivery Providers

Read:

- `docs/specifications/communication-module.md`
- `docs/tasks/027-communication/27.3-email.md`
- `docs/ai/SECURITY_RULES.md`
- `docs/ai/MULTI_TENANCY_RULES.md`
- `docs/ai/DATABASE_STANDARDS.md`
- `docs/ai/API_STANDARDS.md`

Define provider configuration, adapter selection, authorized credential
references, email delivery attempts, and provider-neutral failure mapping. Do
not implement Task 27.3 unless explicitly requested.

## Status Maintenance

Update this file after every substantive task. Keep it short; historical detail
belongs in `TASK_LOG.md`, while future sequencing belongs in
`docs/tasks/000-roadmap.md`.
