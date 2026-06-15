# Device Registration, Trusted Sessions, and Terminal Management Module

## Status

Planned.

Task 32 is split into:

* Task 32.1 Device Registry Foundation
* Task 32.2 Device Enrollment and Activation
* Task 32.3 Trusted Sessions
* Task 32.4 Terminal Management
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

* Device
* DeviceEnrollment
* TrustedSession
* Terminal
* DeviceSecurityPolicy
* DeviceAssignment

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

* DEVICE_VIEW
* DEVICE_REGISTER
* DEVICE_ACTIVATE
* DEVICE_DEACTIVATE
* DEVICE_ASSIGN
* DEVICE_SECURITY_MANAGE
* TERMINAL_MANAGE

## Audit Requirements

Audit:

* device registration
* device activation
* device deactivation
* terminal assignment
* trusted session creation
* trusted session revocation
* security policy changes

## Non-Goals

* MDM integration
* biometric authentication
* certificate infrastructure
* enterprise endpoint management

These belong to future modules.
