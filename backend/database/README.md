# Database

PostgreSQL schema ownership, database conventions, row-level security policies,
seed strategy, and generated schema documentation belong here.

Prisma-managed application migrations live in
`backend/api/prisma/migrations`. Cross-application database administration and
operational SQL may use `backend/migrations` when introduced by a dedicated
task.

The implemented tenancy and authorization contract is documented in
`docs/database/tenancy-authorization-schema.md`.
