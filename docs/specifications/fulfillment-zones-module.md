# Delivery, Pickup, Fulfillment, and Address Zones Module

## Status

Planned. Task 39 builds on customer ordering and order lifecycle foundations.

Task 39 is split into:

* Task 39.1 Fulfillment Method and Policy Foundation
* Task 39.2 Customer Address and Zone Management
* Task 39.3 Delivery and Pickup Order Lifecycle
* Task 39.4 Fulfillment Capacity and Time Slots
* Task 39.5 Fulfillment Customer and Admin UI

## Objective

Support delivery and pickup ordering with tenant/outlet fulfillment policies,
address zones, fees, capacity controls, pickup timing, delivery assignment
foundations, and customer/admin UI.

## Ownership

This module owns:

* fulfillment methods and policies
* delivery zones and address eligibility
* pickup and delivery timing rules
* fulfillment lifecycle states
* fulfillment capacity windows
* delivery/pickup customer and admin UI

Orders own commercial order records. Payments own payment capture and
verification.

## Data Model

Planned entities:

* `FulfillmentPolicy`: tenant default and outlet override policy
* `DeliveryZone`: outlet-scoped delivery area and fee rules
* `CustomerDeliveryAddress`: customer address snapshot and validation metadata
* `FulfillmentQuote`: fee, ETA, and eligibility snapshot
* `FulfillmentOrder`: order-linked delivery or pickup lifecycle state
* `FulfillmentCapacitySlot`: outlet capacity by method and time window
* `FulfillmentEvent`: append-only state history

All operational records carry tenant scope. Outlet-specific fulfillment rows
carry `outletId`.

## Scope Rules

Tenant default + outlet override applies to enabled methods, minimum order,
delivery fees, pickup windows, service hours, and capacity limits.

Offline support classification: limited. Staff may view and manage locally
cached fulfillment work where POS offline support exists, but customer delivery
and pickup ordering requires online API access.

## Invariants

* Delivery eligibility is evaluated by backend policy and zone rules.
* Customer addresses are snapshotted on order confirmation.
* Fees and ETA are snapshotted in the fulfillment quote.
* Fulfillment lifecycle is append-only through events.
* Capacity is checked at confirmation time.
* Outlet authorization is required for staff fulfillment actions.
* Cross-outlet fulfillment reassignment is explicit and auditable.

## Authorization

Suggested permissions:

* `fulfillment.view`
* `fulfillment.manage`
* `fulfillment.policy_manage`
* `fulfillment.zones_manage`
* `fulfillment.capacity_manage`

Customer APIs use customer or guest session authorization.

## API

Planned APIs:

* `GET /fulfillment/policies`
* `POST /fulfillment/policies`
* `PATCH /fulfillment/policies/:id`
* `GET /fulfillment/zones`
* `POST /fulfillment/zones`
* `PATCH /fulfillment/zones/:id`
* `POST /fulfillment/quotes`
* `GET /fulfillment/orders`
* `GET /fulfillment/orders/:id`
* `POST /fulfillment/orders/:id/accept`
* `POST /fulfillment/orders/:id/mark-ready`
* `POST /fulfillment/orders/:id/dispatch`
* `POST /fulfillment/orders/:id/complete`
* `GET /fulfillment/capacity-slots`
* `POST /fulfillment/capacity-slots`

## Flutter

Customer app:

* delivery/pickup selection
* address entry and zone eligibility
* fulfillment quote display
* pickup/delivery time selection
* fulfillment status display

Admin/restaurant app:

* policy and zone administration
* delivery/pickup queue
* capacity management
* state transition controls

## Audit Requirements

Audit:

* policy and zone changes
* delivery fee overrides
* order fulfillment state changes
* capacity changes
* cross-outlet reassignment

## Non-Goals

* third-party delivery aggregator integration
* driver payroll
* route optimization
* real-time map tracking
* payment gateway settlement
