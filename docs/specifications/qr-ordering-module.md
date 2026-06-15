# QR Ordering and Table Self-Service Module

## Status

Planned. Task 38 builds on customer ordering foundation and table/order
modules.

Task 38 is split into:

* Task 38.1 QR Table Session Foundation
* Task 38.2 Table Self-Service Ordering APIs
* Task 38.3 Staff Review and Order Injection
* Task 38.4 QR Ordering Customer UI
* Task 38.5 QR Ordering Administration UI

## Objective

Enable guests to scan a table QR code, browse outlet-specific menu
availability, submit table orders, and optionally request staff actions while
preserving staff-controlled order validation.

## Ownership

This module owns:

* QR code session contracts
* table self-service session lifecycle
* self-service order submission workflow
* customer table ordering UI
* QR administration controls

The table module owns table records. The order module owns final order
persistence and kitchen routing.

## Data Model

Planned entities:

* `QrOrderingProfile`: tenant default and outlet override settings
* `TableQrCode`: table/outlet scoped QR identity and status
* `TableOrderingSession`: active guest session for a table
* `SelfServiceOrderRequest`: customer-submitted order waiting for acceptance
* `SelfServiceActionRequest`: call waiter, bill request, or assistance request

All rows carry tenant scope. Table and session rows carry outlet scope.

## Scope Rules

Tenant default + outlet override applies to QR ordering enablement, service
hours, staff approval requirement, payment options, and allowed action
requests.

Offline support classification: online-required for customer devices. Staff
POS may continue offline, but QR order submission requires API availability.

## Invariants

* QR codes never grant administrative access.
* Table session state is scoped to one tenant, outlet, and table.
* Staff approval is configurable but backend validation is always required.
* Customer-submitted orders use current menu availability and pricing.
* Table transfer or closure invalidates stale sessions where configured.
* Duplicate submissions are controlled by idempotency keys.

## Authorization

Suggested permissions:

* `qr_ordering.view`
* `qr_ordering.manage`
* `qr_ordering.requests_view`
* `qr_ordering.requests_manage`

Public QR APIs use signed QR/session tokens. Staff actions use existing RBAC
and outlet authorization.

## API

Planned APIs:

* `GET /qr-ordering/profiles`
* `POST /qr-ordering/profiles`
* `PATCH /qr-ordering/profiles/:id`
* `GET /qr-ordering/tables/:tableId/code`
* `POST /qr-ordering/tables/:tableId/code/rotate`
* `POST /qr-ordering/sessions`
* `GET /qr-ordering/sessions/:id`
* `POST /qr-ordering/sessions/:id/order-requests`
* `GET /qr-ordering/order-requests`
* `POST /qr-ordering/order-requests/:id/accept`
* `POST /qr-ordering/order-requests/:id/reject`
* `POST /qr-ordering/sessions/:id/action-requests`

## Flutter

Customer app:

* QR session landing
* table menu browsing
* cart submission
* order request status
* staff assistance requests

Admin/restaurant app:

* QR enablement settings
* QR code rotation and display
* pending self-service requests

## Audit Requirements

Audit:

* QR code rotation
* QR profile changes
* staff acceptance or rejection of self-service orders
* session invalidation by staff

## Non-Goals

* delivery and pickup ordering
* payment gateway settlement
* public reservation flow
* guest chat
