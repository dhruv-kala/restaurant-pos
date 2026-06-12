# Database Seeding Strategy

## Commands

Run from `backend/api`:

```powershell
npm run seed
npm run seed:master
npm run seed:demo
```

- `seed`: master data plus demo data when the environment permits it.
- `seed:master`: master data only.
- `seed:demo`: master dependencies plus demo data; prohibited in production.

Prisma `db seed` delegates to `prisma/seed.ts`.

## Environment Rules

`SEED_ENV` takes precedence over `NODE_ENV`.

| Environment | Master data | Demo data |
|---|---:|---:|
| development | yes | yes |
| test | yes | yes |
| staging | yes | only with `SEED_DEMO_DATA=true` |
| production | yes | never |

`--mode=demo` throws in production. A normal production `seed` run includes
master data only. The development demo password is never evaluated by a
production seed path.

## Seed Order

1. Countries
2. Currencies
3. Languages
4. Timezones
5. System role templates
6. Permissions
7. System role-permission mappings
8. Order settings and application modules
9. Payment, currency, tax, and receipt settings
10. Inventory catalog
11. Kitchen catalog
12. Customer, loyalty, and timezone settings
13. Demo tenant
14. Demo outlet and stations
15. Demo users, tenant roles, grants, memberships, and outlet assignments
16. Demo tables
17. Demo menu and station routing
18. Demo inventory
19. Demo recipes
20. Demo customers and visit history

All stages run in one database transaction. The runner sets trusted
platform-admin database context inside that transaction so forced RLS remains
enabled while tenant-scoped bootstrap data is inserted.

## Idempotency

Seeds use stable natural keys or reserved deterministic UUIDs with Prisma
`upsert()`. Re-running a seed updates the desired bootstrap state and does not
create duplicate rows. Transaction rollback prevents partial seed graphs and
foreign-key gaps.

Production deployment must apply committed migrations before running master
seeds.
