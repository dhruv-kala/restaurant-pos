# Device Registration, Trusted Sessions, and Terminal Management Module

## Status

Implemented through Task 32.4.

Task 32 is split into:

* Task 32.1 Device Registry Foundation - Complete
* Task 32.2 Device Enrollment and Activation - Complete
* Task 32.3 Trusted Sessions - Complete
* Task 32.4 Terminal Management - Complete
* Task 32.5 Device Security Policies
* Task 32.6 Device Administration UI

## Objective

Provide secure management of restaurant devices used to access the platform.

The module controls:

* device registration
* device activation
* trusted sessions
* terminal assignment
* device status
* device security controls

This module becomes the foundation for POS device security and operational accountability.

## Ownership

* registered devices
* device enrollment
* trusted sessions
* terminal identity
* outlet device assignment
* device security policies
* device auditability

Authentication owns user identity.

This module owns device identity.

## Data Model

Potential entities:

* Device - implemented in Task 32.1
* DeviceEnrollment - implemented in Task 32.2
* TrustedSession - implemented in Task 32.3
* Terminal - implemented in Task 32.4
* DeviceSecurityPolicy
* DeviceAssignment - implemented in Task 32.4

All tenant-owned records carry tenant scope.

Operational devices are outlet scoped.

## Device Types

Examples:

* POS_TERMINAL
* CASHIER_DEVICE
* WAITER_DEVICE
* KITCHEN_DISPLAY
* CUSTOMER_KIOSK
* TABLET
* MOBILE_DEVICE
* ADMIN_WORKSTATION

## Invariants

* Every device belongs to exactly one tenant.
* Operational devices belong to an outlet.
* Trusted sessions are revocable.
* Device activation is auditable.
* Device status changes are auditable.
* Cross-tenant device access is prohibited.
* Device identity cannot be spoofed through client-provided tenant context.

## Authorization

* SUPER_ADMIN may inspect all devices.
* TENANT_ADMIN may manage tenant devices.
* MANAGER may manage outlet devices.
* Operational users may only view their assigned device information.

Suggested permissions:

* `devices.read`
* `devices.register`
* `devices.update_status`
* `devices.activate`
* `devices.deactivate`
* `devices.assign`
* `devices.security_manage`
* `terminals.manage`

Task 32.1 implements only `devices.read`, `devices.register`, and
`devices.update_status`. Task 32.2 adds `devices.enroll` and
`devices.activate`. Task 32.3 adds `devices.manage_sessions`. Task 32.4 adds
`terminals.manage`. Later subtasks may add the remaining permissions.

## API

Device Registry Foundation:

* `POST /devices`
* `GET /devices`
* `GET /devices/:id`
* `PATCH /devices/:id/status`

Task 32.1 implements tenant-scoped device registry records with optional outlet
scope for non-admin operational devices. Device identifiers are unique per
tenant. Registration creates `PENDING` devices. Status updates support
`ACTIVE`, `DISABLED`, and `REVOKED` through optimistic `version` checks.
Registration and status updates write audit events.

Device Enrollment and Activation:

* `POST /devices/:id/enrollments`
* `GET /devices/:id/enrollments`
* `GET /device-enrollments/:id`
* `PATCH /device-enrollments/:id/approve`
* `POST /device-enrollments/activate`

Task 32.2 implements controlled enrollment for registered tenant devices.
Enrollment requests create expiring activation-code records in `REQUESTED`
state. Managers or tenant administrators approve requests with optimistic
`version` checks, moving them to `APPROVED`. Activation requires the matching
device identifier and activation code, marks the enrollment `ACTIVATED`, and
activates the linked device. Enrollment records are tenant scoped, append-only,
RLS protected, and retain masked activation-code metadata only.

Trusted Sessions:

* `POST /devices/:id/trusted-sessions`
* `GET /devices/:id/trusted-sessions`
* `GET /trusted-sessions`
* `GET /trusted-sessions/:id`
* `PATCH /trusted-sessions/:id/renew`
* `PATCH /trusted-sessions/:id/revoke`

Task 32.3 implements trusted device sessions for active devices. Session
creation binds the trusted session to the authenticated actor rather than a
client-supplied user. Session tokens are returned once at creation time, stored
as SHA-256 hashes, and represented by masked values thereafter. Sessions may be
renewed while active and unexpired. Expired active sessions transition to
`EXPIRED`; revoked sessions transition to `REVOKED` with actor and reason
metadata. Session reads and writes enforce tenant scope, outlet access, and
session ownership unless the actor has session-management authority.

Terminal Management:

* `POST /terminals`
* `GET /terminals`
* `GET /terminals/:id`
* `PATCH /terminals/:id`
* `POST /terminals/:id/device-assignments`
* `GET /terminals/:id/device-assignments`
* `GET /device-assignments`
* `PATCH /device-assignments/:id/end`

Task 32.4 implements outlet-scoped terminal identity and device assignment
history. Terminal codes are unique per tenant/outlet. Devices can be assigned
only to active terminals in the same outlet, and only active devices can be
assigned. Assignment history is append-only; ending an assignment records actor,
time, reason, and audit metadata. The database enforces one active assignment
per terminal and one active assignment per device.

## Audit Requirements

Audit:

* device registration
* device enrollment request
* device enrollment approval
* device activation
* device deactivation
* trusted session renewal
* terminal assignment
* terminal creation
* terminal update
* trusted session creation
* trusted session revocation
* security policy changes

## Non-Goals

* MDM integration
* biometric authentication
* certificate infrastructure
* enterprise endpoint management

These belong to future modules.
