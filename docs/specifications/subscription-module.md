# Subscription Management Module

## Status

Tasks 28.1 Plan Management and 28.2 Subscription Lifecycle are implemented.
Tasks 28.3 through 28.6 remain planned.

Task 28 is split into:

* Task 28.1 Plan Management
* Task 28.2 Subscription Lifecycle
* Task 28.3 Feature Entitlements
* Task 28.4 Usage Limits
* Task 28.5 Trial Management
* Task 28.6 Subscription Admin UI

## Objective

Provide SaaS subscription management for restaurant tenants.

The module controls:

* commercial plans
* subscription lifecycle
* feature entitlements
* usage limits
* trial management

This module determines what a tenant is allowed to use.

Business modules must enforce entitlement and limit checks through approved services.

## Ownership

* subscription plans
* plan pricing metadata
* tenant subscriptions
* feature entitlements
* usage limits
* trial periods
* subscription status
* subscription history

## Data Model

* SubscriptionPlan
* SubscriptionPlanFeature
* TenantSubscription
* TenantEntitlement
* UsageCounter
* TrialSubscription

Task 28.1 implements global `SubscriptionPlan` and
`SubscriptionPlanFeature` records. A stable plan code owns numbered versions.
Draft versions are mutable with optimistic concurrency; activated versions and
their feature snapshots are immutable. Updating an activated or deactivated
version creates the next draft version.

Task 28.2 implements tenant-scoped `TenantSubscription` current-state
aggregates and append-only `TenantSubscriptionEvent` history. Lifecycle
commands reference exact plan versions, use tenant-scoped idempotency keys and
optimistic concurrency, and preserve every status and plan transition.

All tenant-owned records carry tenant scope.

## Invariants

* Every tenant has at most one active subscription.
* Plans are immutable after activation.
* Feature access is determined by entitlement evaluation.
* Usage limits are enforced centrally.
* Trial subscriptions automatically expire.
* Subscription history is append-only.
* Cross-tenant access is prohibited.
* Only one active version exists for each plan code.
* Activating a replacement version deactivates the previous active version.
* Plan prices use integer minor units and ISO currency codes.
* Tenant subscription aggregates cannot be deleted.
* Lifecycle events cannot be updated or deleted.
* Only one trial, active, or suspended subscription exists per tenant.

## Authorization

* SUPER_ADMIN manages plans.
* TENANT_ADMIN may view subscription details.
* Only authorized platform administrators may change entitlements.
* Backend authorization is authoritative.

## Feature Categories

Examples:

* outlets
* users
* inventory
* loyalty
* communication
* reports
* customer app
* QR ordering
* API access

## Audit Requirements

Audit:

* plan creation
* plan updates
* subscription activation
* subscription cancellation
* entitlement changes
* limit changes

Sensitive billing information must never be logged.

## Task 28.1 API

All Task 28.1 endpoints require authenticated `SUPER_ADMIN` platform access:

* `POST /subscriptions/plans`
* `GET /subscriptions/plans`
* `GET /subscriptions/plans/:id`
* `GET /subscriptions/plans/:id/versions`
* `PATCH /subscriptions/plans/:id`
* `PUT /subscriptions/plans/:id/features`
* `POST /subscriptions/plans/:id/activate`
* `POST /subscriptions/plans/:id/deactivate`

Task 28.1 plan endpoints do not manage tenant subscriptions. Entitlement
evaluation, usage enforcement, trials, billing, and Flutter administration are
outside Task 28.1.

## Task 28.2 API

Read endpoints are available to `SUPER_ADMIN` and the tenant's own
`TENANT_ADMIN`. Mutation endpoints require `SUPER_ADMIN`:

* `POST /subscriptions/tenants/:tenantId/activate`
* `GET /subscriptions/tenants/:tenantId`
* `GET /subscriptions/tenants/:tenantId/current`
* `GET /subscriptions/tenants/:tenantId/history`
* `GET /subscriptions/tenants/:tenantId/subscriptions/:id`
* `POST /subscriptions/tenants/:tenantId/subscriptions/:id/upgrade`
* `POST /subscriptions/tenants/:tenantId/subscriptions/:id/downgrade`
* `POST /subscriptions/tenants/:tenantId/subscriptions/:id/suspend`
* `POST /subscriptions/tenants/:tenantId/subscriptions/:id/resume`
* `POST /subscriptions/tenants/:tenantId/subscriptions/:id/expire`
* `POST /subscriptions/tenants/:tenantId/subscriptions/:id/cancel`

`TRIAL` is represented in the lifecycle state machine, but trial creation and
automatic expiration remain Task 28.5. Task 28.2 does not implement entitlement
evaluation, usage enforcement, billing, or Flutter administration.

## Non-Goals

* payment gateway processing
* invoice generation
* tax calculations
* collections management

These belong to later modules.
