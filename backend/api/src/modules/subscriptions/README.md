# Subscriptions Module

Tasks 28.1 through 28.6 implement platform-managed, versioned subscription
plans, tenant subscription lifecycle, feature entitlement evaluation, central
usage-limit enforcement, trial management, and shared Flutter administration
contracts under `/subscriptions`.

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

Usage counters support lifetime, daily, and monthly UTC periods with atomic,
idempotent consumption and configurable block, warn, or allow behavior.
Counter history is append-only, and platform reconciliation is audited.

Trials create linked `TRIAL` tenant subscriptions, support extension, expiry,
due-expiry processing, and conversion to paid `ACTIVE` subscriptions. Trial
history is append-only and audited.

Billing, invoicing, collections, and payment gateway workflows remain deferred.
