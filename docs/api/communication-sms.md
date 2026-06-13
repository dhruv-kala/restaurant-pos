# Communication SMS Delivery

Task 27.4 adds SMS execution through the Twilio Messages REST API.

## Provider Configuration

An active tenant `CommunicationProvider` must use:

- `channel`: `SMS`
- `providerKey`: `twilio`
- `secretReference`: `env:TWILIO_AUTH_TOKEN` or another approved environment
  variable reference

`configMetadata` accepts:

```json
{
  "accountSid": "AC00000000000000000000000000000000",
  "fromNumber": "+15551234567",
  "timeoutMs": 15000
}
```

Use exactly one sender:

- `fromNumber` in E.164 format, or
- `messagingServiceSid` matching a Twilio `MG` SID

The auth token remains outside PostgreSQL and is resolved only during provider
execution.

## Delivery Semantics

`SmsDeliveryService.deliver` is an internal application service. It uses the
same channel-neutral executor as email delivery:

1. authorize and resolve tenant scope;
2. atomically claim an available queued SMS;
3. select the active Twilio provider;
4. create and start an append-only delivery attempt;
5. decrypt and validate the E.164 recipient in memory;
6. send a form-encoded Twilio Message request;
7. record `SENT`/`ACCEPTED` or `FAILED`;
8. append a redacted audit event.

Twilio request privacy options discard provider-side body retention and
obfuscate the recipient address where supported.

Twilio acceptance maps to local `SENT`. Carrier-confirmed `DELIVERED` or
`UNDELIVERED` state requires the signed webhook processing assigned to Task
27.7.

## Validation

- Recipient numbers must use E.164 format.
- SMS bodies must contain 1 to 1600 characters.
- Account and Messaging Service SIDs are validated before network access.
- HTTP 408, 429, 5xx, timeout, and network failures are classified as retryable.
- Retry scheduling is not executed in this task.

## Deferred

- MSG91 and TextLocal adapters
- background workers and retry scheduling
- delivery receipt webhooks
- public resend commands
- provider administration UI
