# Offline Sync Architecture

## Status

Implemented through Task 33.6.

This document defines the offline architecture boundary. SQLite projection,
sync queue, local change-log storage, and local conflict resolution persistence
exist through Task 33.4. Task 33.5 adds a bounded background sync service
foundation, batch history, and checkpoint tracking. Task 33.6 adds offline POS
operation foundations for orders, bills, payments, and receipts.

## Goals

Offline operation must allow restaurant devices to continue approved operations
when connectivity is unavailable, then synchronize without silently losing or
overwriting data.

The offline capability is a platform layer:

```text
Flutter UI
  -> feature repository
  -> offline repository facade
  -> SQLite projection and sync queue
  -> sync coordinator
  -> typed API client
  -> NestJS domain APIs
  -> PostgreSQL
```

Business modules continue to own business rules. The offline layer owns local
persistence, queued command durability, sync state, checkpoints, retries,
conflict tracking, and recovery workflows.

## Device Scope

Every offline record must carry:

* `tenantId`
* `outletId`
* `deviceId`
* actor user identity where the operation is user initiated
* business timestamp or `businessDate` where the domain requires it

Offline mode is permitted only on previously authenticated trusted devices. It
does not grant permissions. Backend authorization remains authoritative when
queued commands are synchronized.

## Identifier Strategy

Offline-created records use globally unique identifiers before they reach the
server. The identifier must be stable across retries and must not be replaced
after synchronization.

Required identifier metadata:

* `id`
* `tenantId`
* `outletId`
* `deviceId`
* `createdAt`

Queued commands also include a stable `idempotencyKey`. Retrying the same
operation reuses the same key.

## Local Persistence Boundary

Task 33.2 defines the first local SQLite tables in
`apps/restaurant-app/lib/core/offline`:

* `device_sync_state`
* `local_orders`
* `local_bills`
* `local_payments`
* `local_receipts`
* `local_customers`
* `local_inventory_items`
* `sync_queue`
* `local_change_log`
* `sync_conflicts`
* `sync_conflict_decisions`
* `sync_batches`
* `sync_checkpoints`

The tables preserve tenant, outlet, and device scope, store globally stable
local IDs, and keep source payload JSON so future sync tasks can avoid lossy
projection changes.

Task 33.3 appends `sync_queue` and `local_change_log` rows transactionally for
create, update, and delete changes. Queue rows are insert-only at this stage;
state transition workers are deferred.

Task 33.4 records `sync_conflicts`, moves affected queue items to `CONFLICT`,
and records resolution decisions in append-only `sync_conflict_decisions`.
Server-authority decisions close local queue items as `SUCCESS`; client-wins
decisions return them to `PENDING`; manual-review decisions keep them in
`CONFLICT`. Financial entity conflicts require manual review.

Task 33.5 claims pending/retryable queue items, sends them through an injected
transport, applies success/retry/failure/conflict states, records sync batches,
and updates per-module pull checkpoints. The transport abstraction allows
future API client wiring without hard-coding routes in the local storage layer.

Task 33.6 adds `OfflinePosOperationsService` for local order creation and
status updates, bill generation, manual payment recording, and receipt
generation. Each operation writes the local projection and sync queue/change-log
entry atomically so reconnect synchronization can continue from SQLite.

Future approved table groups are:

* pulled server-change staging tables when projection application is added

Task 33.6 intentionally does not implement inventory/customer offline workflows
or admin sync monitoring UI.

## Command Flow

```mermaid
sequenceDiagram
    participant UI as Flutter UI
    participant Repo as Feature Repository
    participant Local as Offline Repository
    participant Queue as Sync Queue
    participant Sync as Sync Coordinator
    participant API as NestJS API

    UI->>Repo: Execute command
    Repo->>Local: Validate local preconditions
    Local->>Local: Update local projection
    Local->>Queue: Append SyncQueueItem
    Queue-->>UI: Local success
    Sync->>Queue: Claim pending item
    Sync->>API: Push idempotent command
    API-->>Sync: Accepted / conflict / failure
    Sync->>Queue: Mark final or retry state
```

Local command acceptance is not the same as server acceptance. The UI must make
pending sync state visible for operationally important records.

## Pull Flow

The sync coordinator pulls server changes using a checkpoint cursor:

```text
SyncCheckpoint(cursor)
  -> pull bounded server changes
  -> apply local projection transactionally
  -> update cursor after successful apply
```

Cursors are tenant, outlet, device, and module scoped.

## Queue State Model

Supported queue states:

* `PENDING`
* `IN_PROGRESS`
* `SUCCESS`
* `FAILED`
* `CONFLICT`
* `RETRYING`

Failed synchronization never deletes local records. Queue entries are
append-only for audit and recovery. Later tasks may compact successful entries
only after durable audit and checkpoint guarantees exist.

## Conflict Principles

Conflict resolution priority:

1. explicit business rule
2. server authority
3. manual review
4. last write wins only when explicitly approved

Financial records, inventory ledgers, loyalty ledgers, fiscal records, and
audit history must not use automatic overwrite behavior.

## Payment Strategy

Offline payment verification modes:

* `MANUAL`
* `GATEWAY`
* `OFFLINE`

Offline payment verification statuses:

* `PENDING`
* `VERIFIED`
* `FAILED`

Cash, manually verified UPI, manually verified card, and manually verified bank
transfer records may be marked `VERIFIED` offline. Gateway payments remain
`PENDING` until online verification completes.

## Shared Contracts

Task 33.1 adds framework-independent Dart contracts in
`packages/shared_models/lib/src/offline/offline_sync_models.dart`:

* `OfflineIdentifier`
* `DeviceSyncState`
* `SyncQueueItem`
* `SyncBatch`
* `SyncConflict`
* `SyncCheckpoint`
* `SyncPushRequest`
* `SyncPullRequest`

These contracts are intentionally storage-neutral. Task 33.2 maps
`DeviceSyncState` and local read projections to SQLite.

## Non-Goals

Task 33.6 does not implement:

* offline inventory and customer workflows
* admin sync monitoring UI
