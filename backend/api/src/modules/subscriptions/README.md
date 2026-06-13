# Subscriptions Module

Task 28.1 implements platform-managed, versioned subscription plans and feature
snapshots under `/subscriptions/plans`.

Activated plan versions are immutable. Updating an activated or deactivated
version creates the next draft version, preserving stable historical
references. Tenant subscriptions, entitlements, usage limits, trials, billing,
and administration UI remain deferred.
