# Transactional Outbox, Background Jobs, and Scheduler Module

## Status

Implemented through Task 34.5.

Task 34 is split into:

- Task 34.1 Transactional Outbox Foundation - Complete
- Task 34.2 Background Job Registry and Worker Foundation - Complete
- Task 34.3 Scheduler Foundation - Complete
- Task 34.4 Retry, Dead Letter, and Recovery Controls - Complete
- Task 34.5 Operations Administration UI - Complete

## Objective

Provide reliable asynchronous processing for domain events, delayed work, and
scheduled system jobs without introducing a cloud dependency.

The module must let business modules persist work atomically with their own
database changes and execute it later through controlled workers.

## Ownership

This module owns:

- transactional outbox records
- job definitions and job runs
- scheduler definitions and trigger history
- retry, lease, and dead-letter state
- worker health and operational visibility

Business modules continue to own business rules and event payload semantics.

## Data Model

Planned entities:

- `OutboxEvent`: append-only event created inside a business transaction
- `BackgroundJob`: unit of asynchronous work created from an event or command
- `BackgroundJobAttempt`: append-only execution attempt history
- `ScheduledJob`: tenant/platform schedule definition
- `ScheduledJobRun`: triggered execution record
- `JobDeadLetter`: terminal failure record requiring operator action

Tenant-owned work carries `tenantId`. Outlet-specific work also carries
`outletId`. Platform jobs are explicitly marked platform scope.

Task 34.1 implements `OutboxEvent` with platform or tenant scope, optional
outlet scope for tenant events, idempotency keys, request fingerprints,
redacted payload snapshots, forced RLS, immutable identity/payload triggers, a
transactional writer service, and protected read APIs under `/outbox/events`.

Task 34.2 implements `BackgroundJob` and append-only `BackgroundJobAttempt`
records, idempotent materialization from outbox events, handler registry
contracts, atomic worker claiming with database leases, worker batch execution,
success/failure state transitions, and safe retryable failure metadata.

Task 34.3 implements `ScheduledJob` and immutable `ScheduledJobRun` records
with platform, tenant, and outlet-aware scheduling scopes, interval and
foundation cron validation, pause/resume APIs, due-schedule scanning, and
idempotent materialization into background jobs.

Task 34.4 implements job-type retry policies, bounded backoff calculation,
dead-letter transition after retry exhaustion, tenant/platform scoped
dead-letter retention, manual retry, cancellation, dead-letter resolution, and
protected recovery APIs with audit events.

Task 34.5 implements shared Dart contracts and typed clients for outbox,
background jobs, attempts, dead letters, retry policies, and scheduled jobs,
plus an admin operations console for health visibility and protected recovery
actions.

## Scope Rules

Configuration hierarchy:

Platform default -> tenant default -> outlet override where business scheduling
requires outlet-specific behavior.

Offline support classification: server-only infrastructure. Offline devices
may enqueue sync commands locally, but this module runs in the backend after
commands reach the API.

## Invariants

- Outbox writes happen in the same database transaction as the business change.
- Outbox events are append-only.
- Workers claim jobs atomically with a lease.
- A job is idempotent by tenant, job type, and idempotency key.
- Failed attempts are append-only.
- Retries use bounded policy and never loop forever silently.
- Dead-letter records are retained until explicitly resolved.
- Tenant isolation applies to events, jobs, schedules, and operator views.
- Platform jobs require explicit platform authorization.

## Authorization

Suggested permissions:

- `jobs.view`
- `jobs.manage`
- `jobs.retry`
- `jobs.dead_letter_manage`
- `scheduler.view`
- `scheduler.manage`

Tenant admins may view tenant jobs. Platform operators may view platform jobs
and cross-tenant operational health.

## API

Planned APIs:

- `GET /outbox/events`
- `GET /outbox/events/:id`
- `GET /jobs`
- `GET /jobs/:id`
- `GET /jobs/:id/attempts`
- `POST /jobs/:id/retry`
- `POST /jobs/:id/cancel`
- `GET /scheduler/jobs`
- `POST /scheduler/jobs`
- `PATCH /scheduler/jobs/:id`
- `POST /scheduler/jobs/:id/pause`
- `POST /scheduler/jobs/:id/resume`

Task 34.1 exposes only the outbox read APIs above. Job and scheduler APIs are
deferred until their backing models exist.

Task 34.2 keeps job registry and worker services internal. Public job
administration APIs remain deferred.

Task 34.3 exposes `GET /scheduler/jobs`, `POST /scheduler/jobs`,
`GET /scheduler/jobs/:id`, `POST /scheduler/jobs/:id/pause`, and
`POST /scheduler/jobs/:id/resume`. Full schedule update APIs remain deferred.

Task 34.4 exposes `GET /jobs`, `GET /jobs/:id`, `GET /jobs/:id/attempts`,
`POST /jobs/:id/retry`, `POST /jobs/:id/cancel`, `GET /jobs/dead-letters`,
`POST /jobs/dead-letters/:id/resolve`, `GET /jobs/retry-policies`, and
`PUT /jobs/retry-policies`.

## Flutter

Admin UI is limited to operations visibility and recovery actions:

- job dashboard
- failed and dead-letter queues
- job attempt details
- schedule list and pause/resume actions

Restaurant-app has no UI requirement for this module.

## Audit Requirements

Audit:

- schedule creation and changes
- manual retries
- cancellations
- dead-letter resolution
- worker administrative actions

Sensitive payload fields must be redacted.

## Non-Goals

- distributed queue infrastructure
- cloud scheduler dependency
- Kubernetes cron jobs
- workflow designer
- arbitrary user-authored code execution
