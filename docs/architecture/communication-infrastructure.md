# Communication Infrastructure

Task 27.1 establishes a provider-neutral persistence and service boundary for
email, SMS, WhatsApp, and push delivery.

## Flow

```text
Notification or domain transaction
  -> CommunicationService.enqueue(transaction, request)
  -> immutable CommunicationMessage snapshot
  -> future delivery worker
  -> future channel provider adapter
  -> CommunicationAttempt
```

The enqueue service accepts an existing Prisma transaction so a business event
and its communication request can commit atomically without calling an external
provider inside the transaction.

## Protected Addressing

The schema stores:

- encrypted/ciphertext recipient address
- SHA-256 normalized-address hash for lookup and deduplication
- masked address for authorized history displays

Address encryption and decryption belong at the provider delivery boundary.
Plaintext addresses and provider credentials must not be logged, audited, or
stored in provider metadata.

## Idempotency

Messages are unique by tenant, channel, and idempotency key. A deterministic
request fingerprint binds the key to its immutable request content. An exact
retry returns the existing message; a mismatched retry is rejected.

## Runtime Boundary

No message broker, Redis, cloud queue, PM2 worker, provider implementation,
template system, or webhook handling is introduced by Task 27.1. The indexed
`QUEUED` message table is the durable foundation for later delivery tasks.
General outbox infrastructure remains Task 34.
