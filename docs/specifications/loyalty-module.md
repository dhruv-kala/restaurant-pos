# Loyalty, Rewards, and Wallet Module

## Status

Planned. Customer foundations exist; loyalty implementation is not yet
approved.

## Objective

Provide tenant-scoped loyalty programs, points, tiers, rewards, referrals, gift
value, and wallet balances using immutable ledgers and deterministic
earn/redeem/reversal rules.

## Ownership

- loyalty programs and effective-dated rules
- customer loyalty enrollment and tier state
- append-only points ledger
- rewards and redemption records
- referral attribution
- wallet/gift-card value ledger when approved
- expiry projections and reconciliation

Customers own identity and consent. Orders, bills, and payments provide
immutable commercial references.

## Invariants

- Points and wallet balances derive from append-only ledgers.
- Corrections and refunds create compensating entries.
- Every entry carries tenant, customer/account, reason, reference, actor,
  occurred-at time, and idempotency key.
- Earn is based on approved paid commercial amounts, not mutable cart state.
- Redeem is atomically reserved/committed with the related bill or payment.
- Cross-tenant balances and rewards are impossible.
- Expiry follows a deterministic policy and preserves original history.
- Monetary wallet value uses integer minor units and currency.
- Loyalty rules are versioned/effective-dated so historical calculations remain
  explainable.

## Initial Capabilities

- program and earn-rule administration
- customer enrollment and account summary
- earn quote and committed earn
- redeem quote, reserve, commit, release, and reversal
- points history and expiry
- tier thresholds and benefits
- reward catalog and redemption
- referral code attribution

Wallet, gift cards, promotions, and coalition loyalty require explicit scope.

## Integration

- Customers: account owner and consent
- Orders/Billing: eligible item and discount snapshots
- Payments: confirmed settlement and refund references
- Reports: liability, redemption, breakage, and ROI projections
- Audit: rule changes, manual adjustments, and privileged redemption
- Notifications: earn, redeem, reward, tier, and expiry messages

## Authorization

- Tenant admins manage programs and rules.
- Managers use only explicitly granted operational adjustments.
- Cashiers/waiters may quote or redeem through approved sale workflows.
- Customers may read their own account and perform approved redemptions.
- Manual adjustment requires a reason, permission, and audit event.

## Delivery Order

1. Business rules and accounting/liability decisions
2. Ledger schema, constraints, RLS, and migration
3. Quote, earn, redeem, reversal, and expiry backend contracts
4. Idempotency and concurrency tests
5. Shared models and API clients
6. Admin and customer UI
7. Reporting and notifications

