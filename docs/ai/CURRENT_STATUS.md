# Current Status

Last updated: 2026-06-12

## Current Position

- Completed through: **Task 26**
- Current module: **Notification Center**
- Next provisional task: **Task 27 - Communication Module**
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

## Known Environment Limitation

Committed migrations after the initial foundation have not been deployed to the
local PostgreSQL instance because recorded local credentials are invalid.
Schema validation and automated tests can run; live database behavior requires
valid credentials and migration deployment.

## Next Task

### Task 27 - Communication Module

Read:

- `docs/specifications/notification-module.md`
- `docs/ai/SECURITY_RULES.md`
- `docs/ai/MULTI_TENANCY_RULES.md`
- `docs/ai/DATABASE_STANDARDS.md`
- `docs/ai/API_STANDARDS.md`

Define external email, SMS, WhatsApp, and push channels, templates, consent,
provider adapters, delivery attempts, idempotency, retries, webhooks, and
outbox/worker boundaries. Do not implement Task 27 unless explicitly requested.

## Status Maintenance

Update this file after every substantive task. Keep it short; historical detail
belongs in `TASK_LOG.md`, while future sequencing belongs in
`docs/tasks/000-roadmap.md`.
