# Promotions, Coupons, and Discount Policy Module

## Status

Partially implemented.

Task 29 is split into:

- Task 29.1 Discount Policy Foundation - Complete
- Task 29.2 Coupon Management - Complete
- Task 29.3 Promotion Campaigns - Complete
- Task 29.4 Discount Eligibility Engine - Complete
- Task 29.5 Redemption and Usage Tracking - Complete
- Task 29.6 Promotions Admin UI - Next

## Objective

Provide a tenant-isolated promotions and discount policy engine for restaurant operations.

The module controls:

- manual discounts
- coupon codes
- promotional campaigns
- conditional discounts
- usage limits
- redemption tracking
- discount eligibility validation

This module must support POS, admin, customer ordering, QR ordering, loyalty, and future marketing campaigns.

## Ownership

- discount policies
- coupon definitions
- promotion campaigns
- eligibility rules
- redemption records
- usage limits
- coupon validation
- discount calculation
- discount auditability

Business modules own the source transaction, such as order, bill, customer, loyalty account, or campaign trigger.

## Data Model

Potential entities:

- DiscountPolicy
- Coupon
- PromotionCampaign
- PromotionRule
- PromotionRedemption
- DiscountApplication

All tenant-owned records carry tenant scope and use forced PostgreSQL row-level security.

## Discount Types

Supported discount types:

- percentage discount
- fixed amount discount
- item-level discount
- bill-level discount
- category discount
- buy-one-get-one
- free item
- happy hour discount
- membership discount
- loyalty-linked discount

## Invariants

- Discount calculation must be deterministic.
- Discounts must never bypass tenant isolation.
- Expired coupons cannot be redeemed.
- Inactive promotions cannot be applied.
- Coupon usage limits must be enforced centrally.
- Manual discounts must respect RBAC permissions.
- Redemptions are append-only.
- Discount applications must store calculation snapshots.
- Discounts applied to bills must remain historically stable even if the promotion changes later.
- Cross-tenant coupon use is prohibited.

## Authorization

- `SUPER_ADMIN` may inspect promotions across tenants.
- `TENANT_ADMIN` may manage tenant promotions.
- `MANAGER` may manage outlet promotions if permitted.
- `CASHIER` may apply approved discounts if permitted.
- `WAITER` may view eligible discounts but cannot override limits unless permitted.
- Backend authorization is authoritative.

Suggested permissions:

- `promotions.read`
- `promotions.policy_manage`
- `promotions.apply_discount`
- `promotions.override_discount`
- `promotions.coupon_view`
- `promotions.coupon_manage`
- `promotions.coupon_validate`
- `promotions.campaign_view`
- `promotions.campaign_manage`
- `promotions.eligibility_evaluate`
- `promotions.redemption_view`
- `promotions.redemption_create`

The lowercase `promotions.*` permission keys match the repository's existing
RBAC convention.

## API

Discount Policy:

- `GET /promotions/discount-policies`
- `GET /promotions/discount-policies/:id`
- `POST /promotions/discount-policies`
- `PATCH /promotions/discount-policies/:id`

Coupons:

- `GET /promotions/coupons`
- `GET /promotions/coupons/:id`
- `POST /promotions/coupons`
- `PATCH /promotions/coupons/:id`
- `POST /promotions/coupons/validate`

Promotion Campaigns:

- `GET /promotions/campaigns`
- `GET /promotions/campaigns/:id`
- `POST /promotions/campaigns`
- `PATCH /promotions/campaigns/:id`
- `POST /promotions/campaigns/:id/activate`
- `POST /promotions/campaigns/:id/deactivate`
- `POST /promotions/campaigns/evaluate`

Discount Calculation:

- `POST /promotions/discounts/calculate`
- `POST /promotions/discounts/apply-manual`

Eligibility:

- `POST /promotions/eligibility/evaluate`

The eligibility endpoint evaluates active discount policies, requested coupon
codes, and active promotion campaign rules. It returns all candidates, explicit
denial reasons, selected discounts, stacking rejections, and `createsRedemption:
false`. The current stacking foundation is conservative:
`BEST_SINGLE_DISCOUNT`.

Redemptions:

- `POST /promotions/redemptions`
- `GET /promotions/redemptions`
- `GET /promotions/redemptions/:id`

Redemption creation is idempotent per tenant and source request. Coupon
redemptions enforce total and per-customer limits before insert, increment the
coupon usage counter after the append-only redemption row is created, and write
an audit event. Refunds do not delete or mutate redemption history.

Endpoint availability depends on which Task 29.x implementation has been completed.

## Flutter

Admin Promotions Center:

- discount policy management
- coupon management
- promotion campaign management
- redemption history
- discount rule preview
- usage reporting

Restaurant App:

- eligible coupon lookup
- apply coupon
- apply manual discount
- discount validation result display

Shared:

- promotion models
- typed Dio API client
- Riverpod providers

## Audit Requirements

Audit:

- discount policy creation
- discount policy changes
- coupon creation
- coupon status changes
- promotion campaign changes
- manual discount override
- coupon redemption
- failed redemption attempts due to limit or expiry

Sensitive customer data must not be written to audit logs.

## Non-Goals

- full marketing automation
- customer segmentation engine
- AI offer generation
- campaign communication delivery
- payment settlement discounts
- accounting reconciliation

These belong to dedicated future modules.
