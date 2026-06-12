# Notification Module

## Status

Planned. No implementation is approved by this document.

## Objective

Provide tenant-aware, preference-aware, retryable delivery for in-app, email,
SMS, and push notifications without coupling business modules to providers.

## Ownership

- notification templates and versions
- recipient preferences and consent
- notification message snapshots
- channel delivery attempts
- provider-neutral status and error classification
- deduplication and idempotency
- scheduled delivery and retry policy

Business modules own the triggering domain event and recipient intent.

## Core Contracts

Potential entities:

- `NotificationTemplate`
- `NotificationPreference`
- `NotificationMessage`
- `NotificationDeliveryAttempt`

Every tenant-owned record carries tenant scope. Message snapshots retain the
rendered subject/body and template version used.

## Invariants

- Domain transactions do not call email/SMS/push providers directly.
- Durable event/outbox processing creates messages after commit.
- An idempotency key prevents duplicate messages for the same trigger,
  recipient, template, and channel.
- Consent, quiet hours, locale, and channel preference are evaluated before
  delivery.
- Provider credentials and sensitive payloads are never logged.
- Delivery retries are bounded and classified as retryable or terminal.
- Notification history is append-only except for safe delivery-state
  progression.
- Tenant templates cannot read cross-tenant data.

## Initial Use Cases

- user invitation and password-reset delivery
- kitchen/order operational alerts
- payment and receipt delivery
- low-stock and expiry alerts
- loyalty earn, redemption, reward, and expiry notices
- customer order status
- platform subscription and tenant lifecycle notices

## API Foundation

- template administration
- recipient preference management
- message list/detail
- resend where authorized
- provider webhook ingestion with signature verification

## Delivery Order

1. Channel-neutral domain and consent rules
2. Database and outbox contracts
3. Template rendering and redaction
4. Provider adapter interface
5. API and worker behavior
6. Shared clients and UI

## Non-Goals

- Selecting a cloud provider before the task approves one
- Marketing automation and segmentation
- Replacing Socket.IO operational updates
- Storing provider credentials in the database without a secrets strategy

