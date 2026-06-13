# Subscriptions Module

Tasks 28.1 through 28.3 implement platform-managed, versioned subscription
plans, tenant subscription lifecycle, and feature entitlement evaluation under
`/subscriptions`.

Activated plan versions are immutable. Updating an activated or deactivated
version creates the next draft version, preserving stable historical
references.

Tenant subscriptions reference exact plan-version IDs, enforce one current
subscription per tenant, use idempotent and optimistic lifecycle commands, and
append immutable tenant-scoped history.

Tenant entitlements provide audited, effective-dated overrides over exact plan
features. Evaluation fails closed without an active or trial subscription.
Business routes can enforce features with `@RequiresEntitlement()` and
`EntitlementGuard`.

Usage enforcement, trial creation/automation, billing, and administration UI
remain deferred.
