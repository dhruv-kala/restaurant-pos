# Subscriptions Module

Tasks 28.1 and 28.2 implement platform-managed, versioned subscription plans
and tenant subscription lifecycle under `/subscriptions`.

Activated plan versions are immutable. Updating an activated or deactivated
version creates the next draft version, preserving stable historical
references.

Tenant subscriptions reference exact plan-version IDs, enforce one current
subscription per tenant, use idempotent and optimistic lifecycle commands, and
append immutable tenant-scoped history. Entitlements, usage enforcement, trial
creation/automation, billing, and administration UI remain deferred.
