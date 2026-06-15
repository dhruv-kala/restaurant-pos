# Device Management API

Task 32.1 introduces the device registry foundation.

## Device Registry

All endpoints require JWT authentication. Tenant context is resolved from the
trusted actor unless a platform administrator supplies `tenantId`.

### Register Device

`POST /devices`

Registers a tenant-scoped device in `PENDING` status.

Required body fields:

* `deviceIdentifier`
* `name`
* `deviceType`

Optional body fields:

* `tenantId`
* `outletId`
* `platform`
* `manufacturer`
* `model`
* `osVersion`
* `appVersion`
* `serialNumber`
* `metadata`

Operational device types require `outletId`; `ADMIN_WORKSTATION` may be
tenant-scoped without an outlet.

### List Devices

`GET /devices`

Query filters:

* `tenantId`
* `outletId`
* `status`
* `deviceType`
* `search`
* `page`
* `limit`

Returns the standard paginated response shape.

### Device Detail

`GET /devices/:id`

Optional query:

* `tenantId`

Returns one device when the actor has tenant and outlet access.

### Update Device Status

`PATCH /devices/:id/status`

Body:

* `status`: `ACTIVE`, `DISABLED`, or `REVOKED`
* `version`: optimistic concurrency version

Optional query:

* `tenantId`

Writes `device.status_changed` audit events when status changes.

## Audit Events

* `device.registered`
* `device.status_changed`
