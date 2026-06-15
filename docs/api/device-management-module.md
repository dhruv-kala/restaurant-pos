# Device Management API

Task 32.1 introduces the device registry foundation. Task 32.2 adds device
enrollment and activation. Task 32.3 adds trusted sessions.

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

## Device Enrollment and Activation

### Request Device Enrollment

`POST /devices/:id/enrollments`

Body:

* `tenantId` - optional; platform administrator only
* `expiresInMinutes` - optional, 5 to 1440, defaults to 15

Creates a `REQUESTED` enrollment for a pending or disabled device. The response
includes the one-time plaintext `activationCode`; only a SHA-256 hash and masked
code are stored.

### List Device Enrollment History

`GET /devices/:id/enrollments`

Query:

* `tenantId`
* `page`
* `limit`

Returns paginated enrollment history for the device.

### Device Enrollment Detail

`GET /device-enrollments/:id`

Optional query:

* `tenantId`

Returns one enrollment record when the actor has tenant and outlet access.

### Approve Device Enrollment

`PATCH /device-enrollments/:id/approve`

Body:

* `version`: optimistic concurrency version

Optional query:

* `tenantId`

Moves a `REQUESTED` enrollment to `APPROVED`. Expired requests are transitioned
to `EXPIRED` instead of being approved.

### Activate Device Enrollment

`POST /device-enrollments/activate`

Body:

* `tenantId` - optional; platform administrator only
* `deviceIdentifier`
* `activationCode`

Activates the linked device when the code matches an approved, unexpired
enrollment.

## Trusted Sessions

### Create Trusted Session

`POST /devices/:id/trusted-sessions`

Body:

* `tenantId` - optional; platform administrator only
* `expiresInMinutes` - optional, 5 to 43200, defaults to 1440
* `userAgent` - optional
* `ipAddress` - optional

Creates an `ACTIVE` trusted session for an active device and the authenticated
actor. The response includes the one-time plaintext `sessionToken`; only a
SHA-256 hash and masked token are stored.

### List Device Trusted Sessions

`GET /devices/:id/trusted-sessions`

Query:

* `tenantId`
* `userId`
* `status`
* `page`
* `limit`

Managers and tenant administrators can inspect outlet sessions. Non-manager
users are constrained to their own sessions.

### List Trusted Sessions

`GET /trusted-sessions`

Query:

* `tenantId`
* `deviceId`
* `userId`
* `status`
* `page`
* `limit`

Returns paginated trusted sessions subject to tenant, outlet, and ownership
authorization.

### Trusted Session Detail

`GET /trusted-sessions/:id`

Optional query:

* `tenantId`

Returns one trusted session when the actor has ownership or session-management
authority.

### Renew Trusted Session

`PATCH /trusted-sessions/:id/renew`

Body:

* `version`: optimistic concurrency version
* `expiresInMinutes` - optional, 5 to 43200, defaults to 1440

Optional query:

* `tenantId`

Renews an active, unexpired trusted session. Expired active sessions transition
to `EXPIRED`.

### Revoke Trusted Session

`PATCH /trusted-sessions/:id/revoke`

Body:

* `version`: optimistic concurrency version
* `reason` - optional

Optional query:

* `tenantId`

Revokes a trusted session and records the revoking actor.

## Audit Events

* `device.registered`
* `device.status_changed`
* `device.enrollment_requested`
* `device.enrollment_approved`
* `device.enrollment_expired`
* `device.enrollment_activated`
* `device.activated`
* `trusted_session.created`
* `trusted_session.renewed`
* `trusted_session.expired`
* `trusted_session.revoked`
