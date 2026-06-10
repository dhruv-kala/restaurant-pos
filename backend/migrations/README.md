# Migrations

Reserved for cross-application PostgreSQL administration and operational
migrations that are not owned by the NestJS Prisma schema.

NestJS application schema migrations live in
`backend/api/prisma/migrations` so Prisma can track and deploy them.

Migrations must be backward compatible with the currently deployed API during
rolling application upgrades.
