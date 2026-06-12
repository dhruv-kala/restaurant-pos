# Security Rules

## Authentication

- Use short-lived JWT access tokens and rotating refresh tokens.
- Store refresh tokens and passwords only as secure hashes.
- Revoke affected sessions after credential or high-risk account changes.
- Never return, log, or persist plaintext passwords, reset secrets, or tokens.
- MFA and step-up authentication require explicit future contracts.

## Authorization

- Backend authorization is authoritative.
- Resolve permissions from platform identity or tenant membership, roles, and
  outlet assignments.
- Use least privilege.
- System roles require explicit protection from tenant modification.
- Tenant administrators may grant only permissions within their grant ceiling.
- Platform super-admin is not modeled as an ordinary tenant role.

## Tenant and Outlet Scope

- Derive tenant context from trusted authentication.
- Validate all tenant-owned references within that tenant.
- Check outlet access separately for outlet-scoped operations.
- Apply RLS and repository filters as defense in depth.
- Never trust a request-provided actor, tenant, or outlet scope by itself.

## Passwords and Invitations

- Enforce DTO password-strength and length rules.
- Hash with the repository's approved algorithm and parameters.
- Invitation and reset delivery must use expiring, one-time secrets when that
  infrastructure is implemented.
- Do not expose generated credentials through API responses or logs.

## Sensitive Data

- Commit no secrets, real `.env` files, credentials, or production URLs.
- Redact tokens, hashes, payment details, and sensitive customer data.
- Encrypt sensitive fields where required and use separate normalized lookup
  values when searching encrypted data.
- Avoid storing unnecessary before/after payloads in audit events.

## Audit

- Privileged and security-sensitive actions require immutable audit events.
- Include actor, effective actor, tenant, outlet, action, target, result,
  timestamp, and correlation metadata as applicable.
- Audit access and export are themselves auditable.
- Corrections append events; they do not alter historical audit records.

## Transport and Operations

- Use TLS in production.
- Keep validation, CORS, and authorization strict in development.
- Add rate limits to authentication and abuse-prone endpoints when the
  operational task is approved.
- Impersonation must be explicit, limited, visible, and fully audited.

