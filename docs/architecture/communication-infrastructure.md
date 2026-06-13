# Communication Infrastructure

Task 27.1 establishes a provider-neutral persistence and service boundary for
email, SMS, WhatsApp, and push delivery. Tasks 27.2 through 27.7 implement
templates, the first provider adapters, and verified delivery callbacks on that
boundary.

## Flow

```text
Notification or domain transaction
  -> CommunicationService.enqueue(transaction, request)
  -> immutable CommunicationMessage snapshot
  -> internal channel delivery service
  -> SMTP, Twilio, or Firebase provider adapter
  -> CommunicationAttempt
  -> verified provider webhook
  -> immutable CommunicationWebhook
  -> monotonic attempt/message status synchronization
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

## Push Devices

Task 27.6 adds tenant/user-scoped push installations for Android, iOS, and web.
FCM registration tokens are encrypted with the communication address key,
indexed only by SHA-256 hash, and never returned after registration. A partial
unique index prevents one active token from belonging to multiple tenant
registrations.

FCM token-specific `UNREGISTERED` and `INVALID_ARGUMENT` responses deactivate
the matching registration transactionally with communication failure
finalization. Generic provider or payload errors do not deactivate tokens.

## Webhooks

Task 27.7 exposes `POST /communication/webhooks/:provider` with a required
provider ID query parameter. The route key, provider record, signed request,
and provider ID in generic envelopes must agree before tenant context is
selected.

Twilio callbacks use the official request-signature validator and the exact
configured public webhook URL. Future email and push adapters use an
HMAC-SHA256 JSON envelope that includes the provider ID, provider event ID,
provider message ID, normalized event type, and optional occurrence/error
data.

Only normalized, bounded metadata is retained. Raw payloads, signatures,
credentials, recipient addresses, and provider error descriptions are not
stored. A tenant/provider/event unique key and transaction advisory lock make
replays idempotent.

Delivery updates are monotonic: callbacks may advance accepted attempts to
delivered, failed, bounced, complaint, or WhatsApp read states, but cannot
regress already delivered/read history.

## Runtime Boundary

No message broker, Redis, cloud queue, PM2 worker, or automatic retry scheduler
is introduced through Task 27.7. The indexed `QUEUED` message table remains the
durable delivery foundation. General outbox infrastructure remains Task 34.
