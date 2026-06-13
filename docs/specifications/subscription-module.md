# Subscription Management Module

## Status

Task 28.1 Plan Management is implemented. Tasks 28.2 through 28.6 remain
planned.

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

Task 28.1 does not implement tenant subscriptions, entitlement evaluation,
usage enforcement, trials, billing, or Flutter administration.

## Non-Goals

* payment gateway processing
* invoice generation
* tax calculations
* collections management

These belong to later modules.
