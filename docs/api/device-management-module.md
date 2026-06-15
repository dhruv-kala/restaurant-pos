# Device Management API

Task 32.1 introduces the device registry foundation. Task 32.2 adds device
enrollment and activation. Task 32.3 adds trusted sessions. Task 32.4 adds
terminal management. Task 32.5 adds device security policies.

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
to `EXPIRED`. When an active device security policy exists, the requested
expiry is capped by that policy's `sessionTimeoutMinutes`, and blocked device
types cannot renew trusted sessions.

### Revoke Trusted Session

`PATCH /trusted-sessions/:id/revoke`

Body:

* `version`: optimistic concurrency version
* `reason` - optional

Optional query:

* `tenantId`

Revokes a trusted session and records the revoking actor.

## Terminal Management

### Create Terminal

`POST /terminals`

Body:

* `tenantId` - optional; platform administrator only
* `outletId`
* `terminalCode`
* `name`
* `terminalType`: `POS_COUNTER`, `CASHIER_STATION`, `KITCHEN_SCREEN`,
  `WAITER_STATION`, or `CUSTOMER_KIOSK`
* `description` - optional

Creates an outlet-scoped terminal. Terminal codes are unique per tenant/outlet.

### List Terminals

`GET /terminals`

Query:

* `tenantId`
* `outletId`
* `status`
* `terminalType`
* `search`
* `page`
* `limit`

Returns paginated terminals subject to tenant and outlet authorization.

### Terminal Detail

`GET /terminals/:id`

Optional query:

* `tenantId`

Returns one terminal.

### Update Terminal

`PATCH /terminals/:id`

Body:

* `name` - optional
* `status` - optional, `ACTIVE` or `INACTIVE`
* `description` - optional
* `version`: optimistic concurrency version

Optional query:

* `tenantId`

Updates terminal metadata or active/inactive status.

### Assign Device To Terminal

`POST /terminals/:id/device-assignments`

Body:

* `deviceId`
* `terminalVersion`: optimistic terminal version

Optional query:

* `tenantId`

Creates an active assignment between an active terminal and an active device in
the same outlet. The database enforces one active assignment per terminal and
one active assignment per device.

### List Terminal Assignments

`GET /terminals/:id/device-assignments`

Query:

* `tenantId`
* `deviceId`
* `status`
* `page`
* `limit`

Returns assignment history for a terminal.

### List Device Assignments

`GET /device-assignments`

Query:

* `tenantId`
* `terminalId`
* `deviceId`
* `status`
* `page`
* `limit`

Returns assignment history.

### End Device Assignment

`PATCH /device-assignments/:id/end`

Body:

* `version`: optimistic concurrency version
* `reason` - optional

Optional query:

* `tenantId`

Ends an active device assignment and records the actor, timestamp, and reason.

## Device Security Policies

### Create Device Security Policy

`POST /device-security-policies`

Body:

* `tenantId` - optional; platform administrator only
* `outletId` - optional; outlet override scope
* `name`
* `requireTrustedSession` - optional, defaults to `false`
* `sessionTimeoutMinutes` - optional, 5 to 43200, defaults to 1440
* `forceLogoutBefore` - optional ISO timestamp
* `allowedDeviceTypes` - optional list of `DeviceType`; empty means all types
* `restrictions` - optional JSON payload reserved for future policy flags

Creates one active security policy for the tenant or outlet scope. Requires
`devices.security_manage`. If `forceLogoutBefore` is set, matching active
trusted sessions are revoked.

### List Device Security Policies

`GET /device-security-policies`

Query:

* `tenantId`
* `outletId`
* `status`
* `page`
* `limit`

Returns paginated tenant-visible policies.

### Device Security Policy Detail

`GET /device-security-policies/:id`

Optional query:

* `tenantId`

Returns one policy when the actor has tenant and outlet access.

### Update Device Security Policy

`PATCH /device-security-policies/:id`

Body:

* `version`: optimistic concurrency version
* `name` - optional
* `status` - optional, `ACTIVE` or `INACTIVE`
* `requireTrustedSession` - optional
* `sessionTimeoutMinutes` - optional
* `forceLogoutBefore` - optional ISO timestamp or null
* `allowedDeviceTypes` - optional
* `restrictions` - optional JSON payload or null

Updates policy metadata. Re-activating a policy fails when another active policy
already exists for the same scope. Policy changes are audited.

### Evaluate Effective Device Security Policy

`GET /devices/:id/security-policy`

Optional query:

* `tenantId`

Returns the effective outlet policy, tenant policy, or default policy response
for the device, including whether the current device type is allowed.

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
* `terminal.created`
* `terminal.updated`
* `terminal.device_assigned`
* `terminal.device_assignment_ended`
* `device_security_policy.created`
* `device_security_policy.updated`
