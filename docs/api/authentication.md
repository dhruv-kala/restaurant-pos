# Authentication API

## Scope

Task 7 implements local email/password authentication with bcrypt, JWT access
tokens, rotating refresh tokens, logout revocation, and Passport JWT bearer
authentication.

MFA, password reset, email verification, tenant switching, device sessions,
platform-super-admin authentication, and permission guards are later work.

## Endpoints

### `POST /api/v1/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

Successful response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "<user-id>",
    "email": "admin@example.com",
    "name": "Admin User",
    "tenantId": "<tenant-id>",
    "outletId": "<outlet-id>",
    "roles": ["TENANT_ADMIN"]
  }
}
```

Invalid email and invalid password both return `401` with the generic message
`Invalid email or password`.

### `POST /api/v1/auth/refresh`

Accepts the current refresh token and returns a new access token and refresh
token. The old record is revoked atomically with creation of its replacement.

### `POST /api/v1/auth/logout`

Validates and revokes the supplied refresh token.

### `GET /api/v1/auth/me`

Requires `Authorization: Bearer <access-token>` and returns the non-sensitive
authenticated user context embedded in the access token.

## Token Contracts

Access claims:

- `sub`
- `email`
- `name`
- `tenantId`
- `outletId`
- `roles`
- `type: access`

Refresh claims:

- `sub`
- `jti`
- `type: refresh`

Access and refresh tokens use separate secrets and expiration settings.

## Tenant Context Selection

The login request does not currently contain a tenant selector. Authentication
chooses the oldest active membership, establishes trusted tenant context, and
then loads tenant roles and outlet assignments.

Users without an active tenant membership receive a global identity context with
null tenant/outlet values and no roles. Explicit tenant switching is later work.

## Storage and Security

- `UserAccount.passwordHash` stores an optional bcrypt local credential.
- `RefreshToken.tokenHash` stores only a bcrypt hash.
- Raw refresh tokens are returned once and never persisted.
- Refresh-token records track expiry, revocation, and replacement token ID.
- Login failures do not reveal whether an email exists.
- Invalid, expired, revoked, mismatched, and unknown refresh tokens all return
  an unauthorized response.
- Password and refresh-token hashes are never exposed by response DTOs.
