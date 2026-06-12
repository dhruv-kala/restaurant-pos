# API Standards

## Routing

- Use the configured versioned API prefix.
- Use plural resource routes and stable identifiers.
- Separate commands from queries when lifecycle behavior is not ordinary CRUD.
- Document introduced or changed endpoints in Swagger and `docs/api`.

## Authentication and Scope

- Protected endpoints require authenticated backend authorization.
- Resolve tenant and actor from trusted authentication.
- Validate outlet access independently.
- Client role checks do not authorize requests.
- Platform access and impersonation must be explicit and auditable.

## Request Contracts

- Use explicit DTOs and allow-listed fields.
- Validate UUIDs, enums, strings, ranges, arrays, dates, and money boundaries.
- Never accept computed totals or actor identity as authoritative.
- Retryable writes require an idempotency contract.
- Mutable aggregates use expected versions where concurrency matters.

## Collection Queries

Default collection contracts should support only required capabilities:

- `page` and `limit`
- `search`
- domain filters such as `status`, `outletId`, or date range
- allow-listed `sortBy`
- `sortOrder` of `asc` or `desc`

Use bounded page sizes. Tenant and authorization filters are always applied
server-side and cannot be disabled by query parameters.

Recommended response shape:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Single-resource responses may return the typed resource directly when that is
the established module convention.

## Errors

- Use meaningful HTTP status codes.
- Return stable machine-readable error codes for client branching.
- Return safe messages and field validation details.
- Do not leak SQL, Prisma internals, stack traces, hashes, tokens, or secrets.
- Distinguish validation, authentication, authorization, not-found, conflict,
  and idempotency outcomes.

## Compatibility

- Prefer additive changes.
- Coordinate backend, shared models, API client, providers, and UI for contract
  changes.
- Do not silently rename fields or alter enum meaning.

