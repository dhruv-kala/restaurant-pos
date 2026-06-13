# Communication Template API

Task 27.2 provides tenant-scoped template administration. All endpoints require
JWT authentication and backend authorization.

## Permissions

- `communication.template_view`: list, inspect, preview, and view versions
- `communication.template_manage`: all view operations plus create and update

`SUPER_ADMIN` may operate across tenants when `tenantId` is supplied.
`TENANT_ADMIN` receives both permissions by default.

## Endpoints

- `GET /communication/templates`
- `GET /communication/templates/:id`
- `POST /communication/templates`
- `PATCH /communication/templates/:id`
- `GET /communication/templates/:id/versions`
- `POST /communication/templates/:id/preview`

List filters support `tenantId`, `channel`, `status`, `search`, `page`, and
`limit`. Platform administrators must supply `tenantId`.

Create establishes immutable version `1`. Patch requires the aggregate
`version` for optimistic concurrency and creates the next immutable template
version for every accepted edit.

## Variables

Placeholders use scalar names such as `{{customerName}}`. Every placeholder
must be declared, every declaration must be used, and preview values must
exactly match the declared variables. Values may be strings, numbers, or
booleans. Conditionals, nested paths, expressions, and localization are not
supported.

Email templates require a subject. All templates require a non-empty body.

## Audit

Create and update transactions append both template-change and
template-version audit events. Template bodies and rendered content are not
copied into audit metadata.
