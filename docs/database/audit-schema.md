# Audit Schema

## `audit_events`

`audit_events` is the immutable security and business activity ledger.

Core fields:

- global UUIDv7 `id`
- ordered `BIGSERIAL` sequence
- `scope_key` of `PLATFORM` or the tenant UUID
- nullable tenant/outlet scope
- actor, effective actor, and impersonator user IDs
- actor-role snapshot
- action, target type, target ID, result, and reason
- redacted JSON changes and metadata
- correlation, idempotency, IP, and user-agent metadata
- UTC occurrence timestamp
- previous and current SHA-256 hashes

## Integrity

Audit append operations acquire a transaction-scoped PostgreSQL advisory lock
derived from `scope_key`. The service reads the latest event in that scope,
includes its hash in the canonical event payload, calculates the new SHA-256
hash, and inserts the row in the owning business transaction.

Platform and each tenant therefore have independent ordered hash chains.

Database triggers reject all update and delete attempts. Corrections append a
new event.

## Isolation

Forced PostgreSQL RLS allows:

- platform administrators to access platform and tenant events
- tenant context to access only matching tenant events

Outlet authorization is additionally enforced in the service because tenant
RLS alone does not establish outlet permission.

## Indexes

Indexes cover:

- scope and sequence
- tenant and occurrence time
- tenant/outlet and occurrence time
- tenant/actor and occurrence time
- tenant/action and occurrence time
- tenant/target and occurrence time
- correlation ID

## Migration

`20260613180000_add_audit_activity_logging`

The migration also creates audit result/export enums, integrity constraints,
forced RLS, and immutable mutation triggers.

