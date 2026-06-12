# Audit & Activity Logging Module

## Status

Planned for Task 25. This document defines the contract boundary; it does not
implement the module.

## Objective

Provide an immutable, tenant-aware record of security-sensitive and material
business activity without turning application logs into an audit system.

## Ownership

The audit module owns:

- immutable audit events
- action and target taxonomy
- actor/effective-actor and impersonation context
- request correlation metadata
- safe before/after change summaries
- audit search, detail, and export authorization
- retention and integrity foundations

Operational modules remain responsible for publishing audit intent inside the
same transaction or through an approved durable outbox.

## Event Contract

An audit event should support:

- global event ID and ordered sequence
- nullable `tenantId` for platform events
- nullable `outletId`
- actor user ID
- effective actor/impersonator IDs where applicable
- actor role and permission snapshot
- action key such as `users.status.changed`
- target type and target ID
- result: success, denied, or failed where policy requires
- reason and safe change summary
- request/correlation/idempotency identifiers
- source IP/device/user-agent metadata when available
- occurred-at UTC timestamp
- integrity hash and previous hash foundation

## Invariants

- Events are append-only; application roles cannot update or delete them.
- Tenant events are visible only within trusted tenant scope.
- Platform events require platform authorization.
- Cross-tenant support and impersonation events identify both real and
  effective actors.
- Sensitive values, credentials, tokens, hashes, full payment data, and
  unnecessary personal data are never stored.
- Before/after data is allow-listed and redacted by event type.
- Audit search and export are themselves audited.
- Business transactions must not silently succeed if their mandatory durable
  audit event cannot be recorded.

## Initial Audited Actions

- login, refresh abuse, logout, credential/reset events
- user invitation, creation, status, roles, permissions, and outlet access
- role creation, update, activation, permission changes, and deletion
- tenant/outlet lifecycle and configuration
- order cancellation, transfer, discount, and status overrides
- bill generation, void, split, merge, and reprint
- payment completion, refund, and reconciliation
- inventory adjustment, transfer, receiving, and wastage
- report generation/export
- impersonation start, use, and end

## API Foundation

Expected contracts:

- `GET /audit-events`
- `GET /audit-events/:id`
- `POST /audit-events/export`
- platform equivalents or explicit platform scope

Filters should include date range, actor, action, target, result, tenant,
outlet, and correlation ID subject to authorization.

## Authorization

- Super admin: authorized platform and cross-tenant audit scope
- Tenant admin: tenant audit scope
- Manager: approved outlet operational scope
- Other roles: no broad explorer access; self/security history only when
  explicitly designed

Audit export requires a distinct permission and reason.

## Delivery Order

1. Taxonomy, redaction policy, and business rules
2. Prisma schema, constraints, indexes, RLS, and migration
3. Internal append contract and transaction/outbox behavior
4. Query/export DTOs and authorization
5. Backend tests
6. Shared models and API client
7. Admin and super-admin explorer UI
8. Documentation and operational retention guidance

## Non-Goals

- General debug logging
- Metrics or tracing replacement
- Notification delivery
- SIEM integration
- automated retention deletion before legal/product policy is approved

