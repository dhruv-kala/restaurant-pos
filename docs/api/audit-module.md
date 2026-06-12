# Audit & Activity Logging API

All endpoints require JWT authentication. Responses contain safe, redacted
metadata only.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/audit-events` | Filter and paginate authorized audit events |
| GET | `/api/v1/audit-events/:id` | Read one authorized audit event |
| POST | `/api/v1/audit-events/export` | Record an authorized export request |

## Filters

`GET /audit-events` supports:

- `tenantId` for platform administration
- `outletId`
- `actorUserId`
- `action`
- `targetType`
- `targetId`
- `result`
- `correlationId`
- `from` and `to`
- `search`
- `page` and `limit`

Managers are restricted to their authenticated outlet. Tenant administrators
are restricted to their tenant. Platform administrators may query explicit
tenant scope or the platform-wide view.

## Export

Request:

```json
{
  "format": "JSON",
  "filters": {
    "action": "users.",
    "page": 1,
    "limit": 100
  }
}
```

The endpoint records an immutable `audit.events.export.requested` event and
returns `FOUNDATION_READY`. Rendering, storage, and asynchronous delivery are
deferred until the notification/file infrastructure tasks.

## Authorization

- `SUPER_ADMIN`: platform and tenant audit
- `TENANT_ADMIN`: tenant audit
- `audit.read`: read access within trusted scope
- `audit.export`: export request access within trusted scope
- Managers additionally remain constrained to their outlet

Every audit list, detail, and export access creates another audit event.

