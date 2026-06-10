# Restaurant POS API

Minimal production-ready NestJS foundation for the ServeIQ Restaurant POS SaaS
platform.

Business modules, authentication, database models, realtime gateways, and
deployment configuration are intentionally outside this foundation task.

## Requirements

- Node.js 20 or later
- npm
- PostgreSQL 15 or later when database-backed modules are introduced

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

## Run Locally

```powershell
npm run start:dev
```

Endpoints:

- API root: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs`

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

The Prisma datasource and client generator are configured in
`prisma/schema.prisma`. No models or migrations exist yet.

Useful future commands:

```powershell
npm run prisma:generate
npm run prisma:validate
```
