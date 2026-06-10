# Restaurant POS API

Minimal production-ready NestJS foundation for the ServeIQ Restaurant POS SaaS
platform.

Business modules, authentication, database models, realtime gateways, and
deployment configuration are intentionally outside this foundation task.

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
| `JWT_ACCESS_SECRET` | Reserved access-token secret |
| `JWT_REFRESH_SECRET` | Reserved refresh-token secret |
| `JWT_ACCESS_EXPIRES_IN` | Reserved access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | Reserved refresh-token lifetime |
| `CORS_ORIGINS` | Comma-separated allowed origins |

JWT variables are validated now so later authentication work does not introduce
an incompatible environment contract. No JWT behavior is implemented yet.

## PostgreSQL

Ensure PostgreSQL is running, then create the local database:

```powershell
createdb restaurant_pos
```

SQL equivalent:

```sql
CREATE DATABASE restaurant_pos;
```

The local connection string is:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_pos?schema=public
```

Change the username and password to match the local PostgreSQL installation.
Do not commit real credentials.

Generate and validate the Prisma client:

```powershell
npm run prisma:generate
npm run prisma:validate
```

Create a development migration after models are added in a future task:

```powershell
npm run prisma:migrate:dev
```

Apply committed migrations in production:

```powershell
npm run prisma:migrate:deploy
```

Open Prisma Studio:

```powershell
npm run prisma:studio
```

## Run Locally

```powershell
npm run start:dev
```

Endpoints:

- API root: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs`

The health response reports `database: connected` when PostgreSQL responds. If
the database cannot be reached, it safely reports `status: degraded` and
`database: disconnected` without exposing connection details.

## Validation

```powershell
npm run lint
npm run build
npm run test
npm run test:e2e
```

## Production

Build:

```powershell
npm run build
```

Start the compiled application:

```powershell
npm run start:prod
```

`start:prod` is PM2-ready and runs `node dist/main`. A PM2 ecosystem file will be
added with the deployment infrastructure.

## Prisma

The Prisma datasource, client generator, and initial tenancy and authorization
models are configured in `prisma/schema.prisma`.

The initial migration creates tenant, outlet, global user, membership, role,
permission, role assignment, permission assignment, and outlet assignment
tables. It also adds tenant-aware foreign keys, check constraints, UUIDv7
generation, and forced PostgreSQL row-level security.

See `docs/database/tenancy-authorization-schema.md` for the ownership,
authorization, deletion, RLS, and seed contracts.

Prisma commands:

```powershell
npm run prisma:generate
npm run prisma:validate
npm run prisma:format
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
npm run db:seed
```
