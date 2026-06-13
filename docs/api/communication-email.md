# Communication Email Delivery

Task 27.3 adds SMTP execution and protected communication history.

## Administrative API

- `GET /communication/messages`
- `GET /communication/messages/:id`

List filters support `tenantId`, `outletId`, `channel`, `status`, `search`,
`from`, `to`, `page`, and `limit`.

Responses expose masked recipient addresses and safe attempt metadata. Recipient
ciphertext, address hashes, provider secrets, and request fingerprints are not
returned.

Permissions:

- `communication.history_view`
- `communication.send` for trusted internal delivery execution

Tenant administrators receive both permissions. Managers receive outlet-scoped
history access only.

## SMTP Provider Configuration

An active tenant `CommunicationProvider` with:

- `channel`: `EMAIL`
- `providerKey`: `smtp`
- `secretReference`: optional `env:VARIABLE_NAME`

uses `configMetadata` with:

```json
{
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "username": "mailer",
  "fromAddress": "no-reply@example.com",
  "fromName": "Restaurant",
  "replyTo": "support@example.com",
  "rejectUnauthorized": true,
  "connectionTimeoutMs": 10000,
  "greetingTimeoutMs": 10000,
  "socketTimeoutMs": 30000
}
```

The referenced environment variable contains the SMTP password. Credentials
are resolved only at execution time and are never persisted in provider
configuration, attempts, audit events, or API responses.

## Delivery Semantics

`EmailDeliveryService.deliver` is an internal application service. It:

1. atomically claims an available queued email;
2. selects the active SMTP provider;
3. creates and starts an append-only attempt;
4. decrypts the recipient address in memory;
5. executes SMTP;
6. records `SENT`/`ACCEPTED` or `FAILED` attempt state;
7. appends a redacted audit event.

SMTP acceptance establishes `SENT`, not `DELIVERED`. Provider webhook delivery
confirmation belongs to Task 27.7. No public send/resend endpoint or automatic
worker is introduced.

## Address Protection

`COMMUNICATION_ADDRESS_ENCRYPTION_KEY` must contain a 32-byte key encoded as
Base64 or 64 hexadecimal characters. Recipient addresses use AES-256-GCM
ciphertext and are decrypted only immediately before provider execution.

## Deferred

- retry scheduling and background workers
- provider webhooks and delivered-state confirmation
- provider administration UI
- SendGrid, Mailgun, and Amazon SES adapters
- durable attachment storage and retrieval
