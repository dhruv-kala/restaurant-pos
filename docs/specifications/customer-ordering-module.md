# Customer Ordering Application Foundation Module

## Status

Planned. Task 37 establishes the customer ordering foundation before QR
ordering, delivery, pickup, and self-service flows.

Task 37 is split into:

* Task 37.1 Customer Ordering Domain Foundation
* Task 37.2 Public Menu and Availability APIs
* Task 37.3 Customer Cart and Draft Order APIs
* Task 37.4 Customer Authentication and Guest Session Foundation
* Task 37.5 Customer App Foundation UI

## Objective

Provide the foundation for customer-facing ordering through the `customer`
application using backend-owned menu, pricing, tax, promotion, and order
contracts.

## Ownership

This module owns:

* customer ordering session contracts
* public menu exposure rules
* customer cart and draft order state
* guest/customer identity context for ordering
* customer app foundation screens

Menu, tax, promotions, orders, payments, and fulfillment modules continue to
own their business rules.

## Data Model

Planned entities:

* `CustomerOrderingSession`: tenant/outlet scoped customer or guest session
* `CustomerCart`: active cart state
* `CustomerCartItem`: selected menu item, modifiers, notes, and price snapshot
* `CustomerDraftOrder`: validated order preview before confirmation

Tenant scope is derived from restaurant context, not arbitrary request fields.
Outlet scope is required before availability or pricing is finalized.

## Scope Rules

Tenant default + outlet override applies to customer ordering settings,
service availability, menu visibility, and minimum order rules.

Offline support classification: online-required for customer ordering.
Restaurant staff POS remains the offline-first channel.

## Invariants

* Public APIs expose only active tenant/outlet data intended for customers.
* Customer-visible prices use immutable snapshots when a draft order is built.
* Backend recalculates tax and discounts.
* Client cart totals are presentation only.
* Guest sessions cannot access tenant administration data.
* Customer identity is optional for guest cart creation but required where
  loyalty or wallet features apply.

## Authorization

Suggested permissions for administration:

* `customer_ordering.view`
* `customer_ordering.manage`

Public customer APIs use signed tenant/outlet context and guest/customer
session controls instead of staff RBAC.

## API

Planned APIs:

* `GET /customer-ordering/context`
* `GET /customer-ordering/menu`
* `GET /customer-ordering/menu/items/:id`
* `POST /customer-ordering/sessions`
* `GET /customer-ordering/cart`
* `POST /customer-ordering/cart/items`
* `PATCH /customer-ordering/cart/items/:id`
* `DELETE /customer-ordering/cart/items/:id`
* `POST /customer-ordering/draft-orders`

## Flutter

Customer app foundation:

* tenant/outlet context loading
* public menu browsing
* item details
* cart state
* draft order review
* guest/customer session foundation

Admin UI for customer ordering settings is deferred unless needed by the task.

## Audit Requirements

Audit administrative setting changes. Customer browsing does not create audit
events. Confirmed order submission belongs to later ordering tasks.

## Non-Goals

* QR table self-service
* delivery and pickup fulfillment
* online payment gateway checkout
* customer loyalty UI expansion
* marketing campaigns
