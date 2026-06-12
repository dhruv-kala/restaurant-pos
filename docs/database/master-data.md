# Master Data Framework

## Scope

Task 23.5 adds global bootstrap data without duplicating tenant-owned domain
entities.

Global tables:

- `countries`
- `currencies`
- `languages`
- `timezones`
- `application_modules`
- `system_settings`
- `system_role_templates`
- `system_role_permissions`
- existing global `permissions`

Tenant roles remain in `roles`. A system role template is copied into a tenant
only when that tenant is provisioned. `SUPER_ADMIN` remains a platform identity
capability and is not created as an ordinary tenant role.

## Catalog

The initial catalog includes 10 countries, 8 currencies, 8 languages, 8 IANA
timezones, 9 role templates, 184 permissions, and these application modules:

- POS
- KITCHEN
- INVENTORY
- CUSTOMERS
- REPORTS
- LOYALTY
- HR

System settings establish defaults for business date, currency, timezone, tax,
receipts, payments, inventory, orders, kitchen operations, and loyalty.

Order types, order statuses, payment methods, payment statuses, and customer
types remain Prisma/PostgreSQL enums because they already exist as enforced
domain contracts. Their supported values are published through system settings;
parallel lookup tables are intentionally not created.

## Ownership

Master tables are platform-global and do not carry `tenant_id`. Operational
inventory categories, units, kitchen stations, roles, menu records, and
customers remain tenant/outlet scoped and are created only by demo or tenant
provisioning workflows.
