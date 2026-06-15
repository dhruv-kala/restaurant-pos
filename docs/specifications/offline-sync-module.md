# Offline SQLite Operation and Synchronization Module

## Status

Implemented through Task 33.4.

Task 33 is split into:

* Task 33.1 Offline Architecture Foundation - Complete
* Task 33.2 SQLite Local Storage - Complete
* Task 33.3 Sync Queue and Change Tracking - Complete
* Task 33.4 Conflict Resolution Engine - Complete
* Task 33.5 Background Sync Service
* Task 33.6 Offline POS Operations
* Task 33.7 Offline Inventory and Customers
* Task 33.8 Sync Monitoring and Recovery
* Task 33.9 Offline Administration UI

## Objective

Provide offline-first restaurant operations across all supported POS devices and operating systems.

The POS must continue functioning without internet connectivity on:

* Android Tablets
* Android Phones
* iPads
* Windows Devices
* macOS Devices
* Linux Devices

The platform must support complete restaurant operations during temporary or extended network outages and synchronize safely when connectivity returns.

The offline architecture must be a platform capability rather than a feature implemented separately by individual modules.

## Ownership

The Offline Module owns:

* local SQLite persistence
* offline repositories
* change tracking
* synchronization queues
* synchronization state
* conflict resolution
* recovery operations
* synchronization monitoring

Business modules continue to own business rules.

The Offline Module owns data persistence and synchronization.

## Data Model

Potential entities:

* DeviceSyncState - contract defined in Task 33.1 and persisted locally in
  Task 33.2
* SyncQueue - contract defined in Task 33.1 and persisted locally in Task 33.3
* SyncBatch - contract defined in Task 33.1
* SyncConflict - contract defined in Task 33.1 and persisted locally in
  Task 33.4
* SyncCheckpoint - contract defined in Task 33.1
* LocalChangeLog - implemented locally in Task 33.3
* LocalOrderProjection - Task 33.2 SQLite projection
* LocalBillProjection - Task 33.2 SQLite projection
* LocalCustomerProjection - Task 33.2 SQLite projection
* LocalInventoryProjection - Task 33.2 SQLite projection

SQLite mirrors approved online entities.

Task 33.2 adds the first restaurant-app SQLite schema and repository layer for
durable local projections. Task 33.3 adds append-only `sync_queue` and
`local_change_log` tables for recoverable create, update, and delete tracking.
Task 33.4 adds local `sync_conflicts` and append-only
`sync_conflict_decisions` for server wins, client wins, and manual-review
decisions. Background sync and retry workers remain deferred.

## Offline Device Coverage

Offline operation must work on:

### Mobile

* Android
* iOS

### Desktop

* Windows
* macOS
* Linux

The offline architecture must use durable local storage.

Preferred:

* SQLite

Do not depend on browser-only storage.

Flutter Web offline support may be implemented separately and is not considered the primary POS target.

## Supported Offline Operations

The POS must support the following while offline:

### Authentication

Previously authenticated users may continue operating on trusted devices.

### Menu Operations

* menu lookup
* category lookup
* pricing lookup

### Table Operations

* table status
* table assignment
* table transfers

### Orders

* order creation
* order updates
* order cancellation
* order status changes

### Kitchen Operations

* KDS queue
* order preparation
* item status updates

### Billing

* bill generation
* bill updates
* bill closing

### Payments

* cash payments
* manual UPI payments
* manual card payments
* manual bank transfer recording

### Receipts

* receipt generation
* receipt printing

### Customers

* customer lookup
* customer creation
* customer updates

### Inventory

* stock adjustments
* stock lookups
* inventory consumption

### Operations

* shift opening
* shift closing
* cash drawer operations
* business day operations

## Payment Strategy

The platform follows a hybrid payment model.

### Cash Payments

Cash payments may be fully completed offline.

Status:

* VERIFIED

### Manual UPI Payments

Customer pays using:

* Google Pay
* PhonePe
* Paytm
* BHIM
* Other UPI Apps

Cashier verifies payment manually.

Status:

* VERIFIED

Verification Mode:

* MANUAL

### Manual Card Payments

Cashier records payment after external verification.

Status:

* VERIFIED

Verification Mode:

* MANUAL

### Gateway Payments

Examples:

* Razorpay
* Stripe
* Cashfree
* PhonePe Gateway

When offline:

Status:

* PENDING_VERIFICATION

Verification Mode:

* GATEWAY

Gateway verification occurs after synchronization.

### Payment Verification Modes

Supported:

* MANUAL
* GATEWAY
* OFFLINE

### Payment Verification Status

Supported:

* PENDING
* VERIFIED
* FAILED

## Synchronization Strategy

Preferred Flow:

Device
↓
SQLite
↓
Sync Queue
↓
Background Sync
↓
API

Business modules never synchronize directly.

All synchronization passes through the Offline Module.

Task 33.1 documents the architecture in
`docs/architecture/offline-sync-architecture.md` and future endpoint contract
shape in `docs/api/offline-sync-module.md`. No sync endpoints are exposed yet.

## Offline Identifiers

Every offline-created record must use:

* globally unique identifier
* tenant scope
* outlet scope

Identifiers must remain valid after synchronization.

Task 33.1 adds `OfflineIdentifier` as the stable client-side identifier
contract. Future tasks must not replace offline IDs after server acceptance.

## Invariants

* POS operations continue without internet.
* Offline records use globally unique IDs.
* Offline financial records are append-only.
* Offline changes are durable.
* Synchronization is idempotent.
* Synchronization never silently drops data.
* Failed synchronization never deletes local records.
* Tenant isolation is preserved offline.
* Outlet isolation is preserved offline.
* Device identity is preserved offline.
* Conflict resolution is auditable.
* Financial records never silently overwrite one another.

## Conflict Resolution Principles

Priority:

1. Explicit Business Rule
2. Server Authority
3. Manual Review
4. Last Write Wins (only when explicitly approved)

Financial records must never use automatic overwrite behavior.

## Synchronization States

Suggested:

* PENDING
* IN_PROGRESS
* SUCCESS
* FAILED
* CONFLICT
* RETRYING

## Authorization

Authentication remains server authoritative.

Offline operation is permitted only for:

* previously authenticated users
* trusted devices
* authorized tenant memberships
* authorized outlet assignments

Offline mode never grants additional permissions.

## Audit Requirements

Audit:

* synchronization failures
* conflict resolution decisions
* queue retries
* recovery operations
* offline payment verification changes

## Reporting Rules

Reports continue using:

* businessDate

Never use synchronization timestamps as business activity timestamps.

## Recovery Requirements

The platform must recover safely from:

* application restart
* device restart
* temporary network loss
* extended network loss
* partial synchronization failure

No approved transaction may be lost because synchronization failed.

## Non-Goals

Not part of this module:

* peer-to-peer synchronization
* multi-master synchronization
* browser-first offline architecture
* offline schema designer
* external synchronization servers

These belong to future platform capabilities.
