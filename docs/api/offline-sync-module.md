# Offline Sync API Contracts

## Status

Task 33.1 defines contracts only. No NestJS offline sync endpoints are exposed
yet.

## Future Endpoint Shape

The offline sync API should be introduced behind authenticated, tenant/outlet
authorized routes in later tasks:

* `GET /sync/state`
* `POST /sync/push`
* `GET /sync/pull`
* `GET /sync/conflicts`
* `PATCH /sync/conflicts/:id/resolve`

These endpoints are not implemented in Task 33.1.

## Device Sync State

`DeviceSyncState` tracks the current device view of synchronization:

* `tenantId`
* `outletId`
* `deviceId`
* `userId`
* `trustedSessionId`
* `syncEnabled`
* `isOnline`
* `lastPullCursor`
* `lastPushedAt`
* `lastPulledAt`
* `pendingCount`
* `failedCount`
* `conflictCount`
* `updatedAt`

## Push Contract

Future push requests use:

* `tenantId`
* `outletId`
* `deviceId`
* `items`

Each item is a `SyncQueueItem`:

* `localId`
* `tenantId`
* `outletId`
* `deviceId`
* `actorUserId`
* `module`
* `entityType`
* `entityId`
* `operationType`
* `idempotencyKey`
* `baseVersion`
* `businessDate`
* `occurredAt`
* `payload`
* `state`
* `attemptCount`
* `lastAttemptAt`
* `nextRetryAt`
* `errorCode`
* `errorMessage`
* `createdAt`
* `updatedAt`

The server must treat each `idempotencyKey` as stable and retryable. Reusing a
key with different command content should be rejected.

## Pull Contract

Future pull requests use:

* `tenantId`
* `outletId`
* `deviceId`
* `cursor`
* `limit`

Responses should return ordered changes plus the next cursor. Cursors are not
global; they are scoped by tenant, outlet, device, and module.

## Conflict Contract

`SyncConflict` records:

* `id`
* `tenantId`
* `outletId`
* `deviceId`
* `queueItemId`
* `entityType`
* `entityId`
* `status`
* `resolutionStrategy`
* `detectedAt`
* `resolvedByUserId`
* `resolvedAt`
* `resolutionNotes`
* `localPayload`
* `serverPayload`

Financial, inventory, loyalty, fiscal, and audit conflicts require explicit
business-rule or manual-review handling. Last-write-wins is not a default.

## State Values

Queue states:

* `PENDING`
* `IN_PROGRESS`
* `SUCCESS`
* `FAILED`
* `CONFLICT`
* `RETRYING`

Operation types:

* `CREATE`
* `UPDATE`
* `DELETE`
* `LIFECYCLE`
* `APPEND`

Conflict statuses:

* `OPEN`
* `RESOLVED`
* `IGNORED`

Conflict resolution strategies:

* `BUSINESS_RULE`
* `SERVER_AUTHORITY`
* `MANUAL_REVIEW`
* `LAST_WRITE_WINS`
