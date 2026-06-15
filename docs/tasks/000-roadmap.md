# Restaurant POS Task Roadmap

Last updated: 2026-06-15

## Roadmap Rules

- `COMPLETE` and `NEXT` reflect current repository status.
- `PLANNED` entries are sequencing guidance, not authorization to implement.
- Task names after Task 25 are provisional and may be split, reordered, renamed,
  or removed by an explicit user decision.
- Execute only the task explicitly requested.
- Detailed completion evidence lives in `docs/ai/TASK_LOG.md`.
- Task 28.1-28.6 were reviewed against the subscription specification on
  2026-06-14.
- Tasks 29.1-29.6 and 30.1-30.6 are complete; Task 37 customer ordering
  application foundation is the next listed provisional task.

## Foundation and Core SaaS

| Task | Status | Provisional scope |
|---|---|---|
| 24 | COMPLETE | RBAC and user management |
| 24.5 | COMPLETE | AI development optimization framework |
| 25 | COMPLETE | Audit and activity logging |
| 26 | COMPLETE | In-app Notification Center, preferences, read state, publishing, shared clients, and Flutter foundations |
| 27.1 | COMPLETE | Communication infrastructure foundation |
| 27.2 | COMPLETE | Communication template management |
| 27.3 | COMPLETE | Email delivery providers |
| 27.4 | COMPLETE | SMS delivery providers |
| 27.5 | COMPLETE | WhatsApp delivery providers |
| 27.6 | COMPLETE | Push notification delivery |
| 27.7 | COMPLETE | Webhooks and delivery tracking |
| 27.8 | COMPLETE | Communication center UI |
| 27.9 | COMPLETE | Communication analytics |
| 28.1 | COMPLETE | Platform-managed versioned subscription plans and feature snapshots |
| 28.2 | COMPLETE | Tenant subscription lifecycle and append-only history |
| 28.3 | COMPLETE | Feature entitlement evaluation and enforcement boundary |
| 28.4 | COMPLETE | Central usage limits, counters, and over-limit policies |
| 28.5 | COMPLETE | Trial lifecycle, expiry handling, and paid conversion |
| 28.6 | COMPLETE | Subscription administration UI |
| 29.1 | COMPLETE | Discount policy foundation, deterministic calculation, immutable application snapshots, RLS, permissions, and audit |
| 29.2 | COMPLETE | Coupon management |
| 29.3 | COMPLETE | Promotion campaigns |
| 29.4 | COMPLETE | Discount eligibility engine |
| 29.5 | COMPLETE | Redemption and usage tracking |
| 29.6 | COMPLETE | Promotions admin UI |
| 30.1 | COMPLETE | Tax foundation |
| 30.2 | COMPLETE | Tax rules and rates |
| 30.2.5 | COMPLETE | Tax architecture review and correction |
| 30.3 | COMPLETE | Fiscal policy administration |
| 30.4 | COMPLETE | Tax calculation engine |
| 30.5 | COMPLETE | Tax reporting foundation |
| 30.6 | COMPLETE | Tax admin UI |
| 31.1 | COMPLETE | Business day foundation |
| 31.2 | COMPLETE | Shift management |
| 31.3 | COMPLETE | Cash drawer management |
| 31.4 | NEXT | Shift closing and reconciliation |
| 31.5 | PLANNED | Business day closing |
| 31.6 | PLANNED | Operations administration UI |
| 32 | PLANNED | Device registration, trusted sessions, and terminal management |
| 33 | PLANNED | Offline SQLite operation and synchronization protocol |
| 34 | PLANNED | Transactional outbox, background jobs, and scheduler |
| 35 | PLANNED | File/document storage abstraction and retention |
| 36 | PLANNED | Webhooks, API integrations, and integration credentials |
## Restaurant and Customer Expansion

| Task | Status | Provisional scope |
|---|---|---|
| 37 | PLANNED | Customer ordering application foundation |
| 38 | PLANNED | QR ordering and table self-service |
| 39 | PLANNED | Delivery, pickup, fulfillment, and address zones |
| 40 | PLANNED | Advanced reservations, waitlist, and guest seating |
| 41 | PLANNED | Purchase requisitions, approvals, and procurement policies |
| 42 | PLANNED | Vendor invoices, payable reconciliation, and purchase costing |
| 43 | PLANNED | Central kitchen, commissary production, and outlet dispatch |
| 44 | PLANNED | Stock counts, wastage approvals, and variance workflows |
| 45 | PLANNED | Demand forecasting and replenishment recommendations |
| 46 | PLANNED | Payroll foundation and compensation records |
| 47 | PLANNED | Leave, availability, scheduling, and approval workflows |
| 48 | PLANNED | Tips, incentives, commissions, and allocation rules |
| 49 | PLANNED | Customer segmentation, consent, and lifecycle cohorts |
| 50 | PLANNED | Campaign management and marketing automation foundation |
| 51 | PLANNED | Wallet, gift cards, stored value, and liability ledger |

## Platform Administration

| Task | Status | Provisional scope |
|---|---|---|
| 52 | PLANNED | Super-admin tenant lifecycle portal |
| 53 | PLANNED | Subscription billing, invoicing, and collections |
| 54 | PLANNED | Feature entitlements, usage limits, and metering |
| 55 | PLANNED | Support cases and audited tenant impersonation |
| 56 | PLANNED | Platform analytics and operational health dashboards |
| 57 | PLANNED | Feature flags and staged rollout controls |
| 58 | PLANNED | White-label branding and custom domains |
| 59 | PLANNED | Franchise hierarchy, policy inheritance, and overrides |
| 60 | PLANNED | Localization, language, regional formats, and translation |

## Security, Reliability, and Operations

| Task | Status | Provisional scope |
|---|---|---|
| 61 | PLANNED | Security hardening and threat-model remediation |
| 62 | PLANNED | MFA, step-up authentication, and recovery |
| 63 | PLANNED | Enterprise SSO and identity federation |
| 64 | PLANNED | API keys, service accounts, and scoped machine access |
| 65 | PLANNED | Rate limiting, abuse prevention, and account lockout |
| 66 | PLANNED | Secrets, environment configuration, and key rotation |
| 67 | PLANNED | Privacy, retention, deletion, and data export controls |
| 68 | PLANNED | PostgreSQL backup, restore, and verification automation |
| 69 | PLANNED | Disaster recovery and business continuity runbooks |
| 70 | PLANNED | Structured logging, metrics, tracing, and alerting |
| 71 | PLANNED | PM2 process management and worker topology |
| 72 | PLANNED | Nginx TLS, static hosting, proxy, and Socket.IO configuration |
| 73 | PLANNED | Ubuntu VPS provisioning and production hardening |
| 74 | PLANNED | CI quality gates and automated validation |
| 75 | PLANNED | Release, migration, rollback, and change-management process |
| 76 | PLANNED | API and Flutter performance optimization |
| 77 | PLANNED | PostgreSQL query, index, partition, and archive optimization |
| 78 | PLANNED | Automated tenant-isolation and RLS verification suite |
| 79 | PLANNED | Load, stress, soak, and capacity testing |
| 80 | PLANNED | Accessibility and responsive-design compliance |

## Product Completion and Scale

| Task | Status | Provisional scope |
|---|---|---|
| 81 | PLANNED | Restaurant mobile release readiness |
| 82 | PLANNED | Admin web production readiness |
| 83 | PLANNED | Customer mobile/web production readiness |
| 84 | PLANNED | Kitchen display deployment and device hardening |
| 85 | PLANNED | Thermal printer, cash drawer, and peripheral integrations |
| 86 | PLANNED | Payment gateway adapters and settlement reconciliation |
| 87 | PLANNED | Fiscal device and government tax integrations |
| 88 | PLANNED | Accounting export and ERP integration |
| 89 | PLANNED | Marketplace and delivery aggregator integrations |
| 90 | PLANNED | Advanced BI datasets and governed analytics exports |
| 91 | PLANNED | Scheduled reports and report distribution |
| 92 | PLANNED | Data import, migration, and tenant onboarding toolkit |
| 93 | PLANNED | Sandbox/demo tenant lifecycle and sales enablement |
| 94 | PLANNED | Automated end-to-end critical workflow suite |
| 95 | PLANNED | Security audit and penetration-test remediation |
| 96 | PLANNED | Financial, inventory, loyalty, and audit reconciliation suite |
| 97 | PLANNED | Operational runbooks, support tooling, and incident response |
| 98 | PLANNED | Pilot rollout, telemetry review, and stabilization |
| 99 | PLANNED | Production launch checklist and go-live rehearsal |
| 100 | PLANNED | General availability readiness review |
