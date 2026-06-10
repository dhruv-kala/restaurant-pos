# Restaurant POS API

NestJS API for the ServeIQ Restaurant POS SaaS platform.

The current foundation includes health checks, Prisma/PostgreSQL tenancy models,
email/password authentication, JWT access tokens, and rotating refresh tokens.

## Requirements

- Node.js 20 or later
- npm
- PostgreSQL 15 or later

## Install

From `backend/api`:

```powershell
npm install
```

## Environment

Copy `.env.example` to `.env` and replace placeholder secrets:

```powershell
Copy-Item .env.example .env
```

Required environment variables:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment |
| `PORT` | HTTP listen port |
| `APP_NAME` | Service name returned by health and Swagger |
| `API_PREFIX` | Global API prefix |
| `DATABASE_URL` | PostgreSQL connection URL for Prisma |
| `JWT_ACCESS_SECRET` | Secret used only for access tokens |
| `JWT_REFRESH_SECRET` | Separate secret used only for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime, for example `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime, for example `7d` |
| `CORS_ORIGINS` | Comma-separated allowed origins |

Use strong, unrelated JWT secrets outside local development. Never commit real
secrets.

## PostgreSQL and Prisma

Create the local database and configure `DATABASE_URL` for the installed
PostgreSQL credentials.

```powershell
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:dev
```

Production uses committed migrations:

```powershell
npm run prisma:migrate:deploy
```

The migrations create tenant and authorization tables plus local password
credentials and revocable refresh-token persistence. They also add tenant-aware
foreign keys, UUIDv7 generation, check constraints, and forced PostgreSQL RLS.

## Local Development Seed

After applying migrations:

```powershell
npm run db:seed
```

When `NODE_ENV` is not `production`, the idempotent seed creates:

- Tenant: `Local Demo Restaurant`
- Outlet: `Main Outlet`
- Role: `TENANT_ADMIN`
- User: `admin@example.com`
- Password: `Admin@123`

This credential is local development data only. Production seeding skips demo
data and only updates the global permission catalog.

## Run Locally

```powershell
npm run start:dev
```

Endpoints:

- API root: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/api/v1/health`
- Auth: `http://localhost:3000/api/v1/auth`
- Swagger: `http://localhost:3000/docs`

## Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Validate email/password and issue a token pair |
| `POST` | `/api/v1/auth/refresh` | Rotate a valid refresh token |
| `POST` | `/api/v1/auth/logout` | Revoke a refresh token |
| `GET` | `/api/v1/auth/me` | Return the authenticated access-token context |

Access tokens are short-lived bearer JWTs. Refresh tokens are stored only as
bcrypt hashes, rotate on successful refresh, and can be revoked by logout.

Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

Authenticated user:

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access-token>"
```

Refresh:

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```

Logout:

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```

## Tenant Management

All tenant endpoints require a bearer access token.

| Method | Endpoint | Access |
|---|---|---|
| `POST` | `/api/v1/tenants` | `SUPER_ADMIN` |
| `GET` | `/api/v1/tenants` | `SUPER_ADMIN`, own tenant for `TENANT_ADMIN` |
| `GET` | `/api/v1/tenants/:id` | `SUPER_ADMIN`, own tenant for `TENANT_ADMIN` |
| `PATCH` | `/api/v1/tenants/:id` | `SUPER_ADMIN`, limited own fields for `TENANT_ADMIN` |
| `PATCH` | `/api/v1/tenants/:id/status` | `SUPER_ADMIN` |

Create a tenant:

```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Authorization: Bearer <super-admin-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Restaurants","legalName":"Acme Restaurants Pvt Ltd","email":"owner@example.com","phone":"+919876543210","outletLimit":3}'
```

Tenant list endpoints accept `page`, `limit`, `search`, and `status`. The default
page size is 20 and the maximum is 100.

## Outlet Management

| Method | Endpoint | Access |
|---|---|---|
| `POST` | `/api/v1/outlets` | `SUPER_ADMIN`, `TENANT_ADMIN` |
| `GET` | `/api/v1/outlets` | `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER` |
| `GET` | `/api/v1/outlets/:id` | `SUPER_ADMIN`, tenant-scoped admin/manager |
| `PATCH` | `/api/v1/outlets/:id` | `SUPER_ADMIN`, tenant-scoped `TENANT_ADMIN` |
| `PATCH` | `/api/v1/outlets/:id/status` | `SUPER_ADMIN`, tenant-scoped `TENANT_ADMIN` |
| `GET` | `/api/v1/tenants/:tenantId/outlets` | Same tenant-scoped read rules |

Create an outlet:

```bash
curl -X POST http://localhost:3000/api/v1/outlets \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"<tenant-id-for-super-admin>","name":"Downtown Outlet","code":"DOWNTOWN","city":"Mumbai","country":"IN"}'
```

List outlets:

```bash
curl "http://localhost:3000/api/v1/outlets?page=1&limit=20&search=downtown" \
  -H "Authorization: Bearer <access-token>"
```

Tenant users cannot override their JWT tenant scope. Platform administrators may
filter by `tenantId`. Outlet creation counts every non-closed outlet and returns
`Outlet limit reached for current subscription plan` when `Tenant.outletLimit`
is reached.

## Validation

```powershell
npm run lint
npm run build
npm run test
npm run test:e2e
```

## Production

```powershell
npm run build
npm run start:prod
```

`start:prod` is PM2-ready and runs `node dist/main`. PM2 and Nginx deployment
configuration remains a later infrastructure task.

## Documentation

- `docs/api/authentication.md`
- `docs/api/tenant-outlet-management.md`
- `docs/database/tenancy-authorization-schema.md`
