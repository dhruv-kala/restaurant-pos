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
- Tasks 29.1-29.6, 30.1-30.6, 31.1-31.6, 32.1-32.6, 33.1-33.9, and 34.1-34.5 are
  complete; Task 35.1 storage abstraction foundation is the next listed
  provisional implementation task.
- Specification and subtask planning files exist for Tasks 34 through 39 only.

## Foundation and Core SaaS

| Task   | Status   | Provisional scope                                                                                                   |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------- |
| 24     | COMPLETE | RBAC and user management                                                                                            |
| 24.5   | COMPLETE | AI development optimization framework                                                                               |
| 25     | COMPLETE | Audit and activity logging                                                                                          |
| 26     | COMPLETE | In-app Notification Center, preferences, read state, publishing, shared clients, and Flutter foundations            |
| 27.1   | COMPLETE | Communication infrastructure foundation                                                                             |
| 27.2   | COMPLETE | Communication template management                                                                                   |
| 27.3   | COMPLETE | Email delivery providers                                                                                            |
| 27.4   | COMPLETE | SMS delivery providers                                                                                              |
| 27.5   | COMPLETE | WhatsApp delivery providers                                                                                         |
| 27.6   | COMPLETE | Push notification delivery                                                                                          |
| 27.7   | COMPLETE | Webhooks and delivery tracking                                                                                      |
| 27.8   | COMPLETE | Communication center UI                                                                                             |
| 27.9   | COMPLETE | Communication analytics                                                                                             |
| 28.1   | COMPLETE | Platform-managed versioned subscription plans and feature snapshots                                                 |
| 28.2   | COMPLETE | Tenant subscription lifecycle and append-only history                                                               |
| 28.3   | COMPLETE | Feature entitlement evaluation and enforcement boundary                                                             |
| 28.4   | COMPLETE | Central usage limits, counters, and over-limit policies                                                             |
| 28.5   | COMPLETE | Trial lifecycle, expiry handling, and paid conversion                                                               |
| 28.6   | COMPLETE | Subscription administration UI                                                                                      |
| 29.1   | COMPLETE | Discount policy foundation, deterministic calculation, immutable application snapshots, RLS, permissions, and audit |
| 29.2   | COMPLETE | Coupon management                                                                                                   |
| 29.3   | COMPLETE | Promotion campaigns                                                                                                 |
| 29.4   | COMPLETE | Discount eligibility engine                                                                                         |
| 29.5   | COMPLETE | Redemption and usage tracking                                                                                       |
| 29.6   | COMPLETE | Promotions admin UI                                                                                                 |
| 30.1   | COMPLETE | Tax foundation                                                                                                      |
| 30.2   | COMPLETE | Tax rules and rates                                                                                                 |
| 30.2.5 | COMPLETE | Tax architecture review and correction                                                                              |
| 30.3   | COMPLETE | Fiscal policy administration                                                                                        |
| 30.4   | COMPLETE | Tax calculation engine                                                                                              |
| 30.5   | COMPLETE | Tax reporting foundation                                                                                            |
| 30.6   | COMPLETE | Tax admin UI                                                                                                        |
| 31.1   | COMPLETE | Business day foundation                                                                                             |
| 31.2   | COMPLETE | Shift management                                                                                                    |
| 31.3   | COMPLETE | Cash drawer management                                                                                              |
| 31.4   | COMPLETE | Shift closing and reconciliation                                                                                    |
| 31.5   | COMPLETE | Business day closing                                                                                                |
| 31.6   | COMPLETE | Operations administration UI                                                                                        |
| 32.1   | COMPLETE | Device registry foundation                                                                                          |
| 32.2   | COMPLETE | Device enrollment and activation                                                                                    |
| 32.3   | COMPLETE | Trusted sessions                                                                                                    |
| 32.4   | COMPLETE | Terminal management                                                                                                 |
| 32.5   | COMPLETE | Device security policies                                                                                            |
| 32.6   | COMPLETE | Device administration UI                                                                                            |
| 33.1   | COMPLETE | Offline architecture foundation                                                                                     |
| 33.2   | COMPLETE | SQLite local storage                                                                                                |
| 33.3   | COMPLETE | Sync queue and change tracking                                                                                      |
| 33.4   | COMPLETE | Conflict resolution engine                                                                                          |
| 33.5   | COMPLETE | Background sync service                                                                                             |
| 33.6   | COMPLETE | Offline POS operations                                                                                              |
| 33.7   | COMPLETE | Offline inventory and customers                                                                                     |
| 33.8   | COMPLETE | Sync monitoring and recovery                                                                                        |
| 33.9   | COMPLETE | Offline administration UI                                                                                           |
| 34.1   | COMPLETE | Transactional outbox foundation                                                                                     |
| 34.2   | COMPLETE | Background job registry and worker foundation                                                                       |
| 34.3   | COMPLETE | Scheduler foundation                                                                                                |
| 34.4   | COMPLETE | Retry, dead letter, and recovery controls                                                                           |
| 34.5   | COMPLETE | Operations administration UI for jobs and scheduler                                                                 |
| 35.1   | NEXT     | Storage abstraction foundation                                                                                      |
| 35.2   | PLANNED  | File metadata, ownership, and access control                                                                        |
| 35.3   | PLANNED  | Upload, download, and signed access                                                                                 |
| 35.4   | PLANNED  | Document retention and deletion policies                                                                            |
| 35.5   | PLANNED  | File administration UI                                                                                              |
| 36.1   | PLANNED  | Integration registry and credential references                                                                      |
| 36.2   | PLANNED  | Outbound webhook subscriptions                                                                                      |
| 36.3   | PLANNED  | Inbound webhook verification foundation                                                                             |
| 36.4   | PLANNED  | API key and integration access controls                                                                             |
| 36.5   | PLANNED  | Integration administration UI                                                                                       |

## Restaurant and Customer Expansion

| Task | Status  | Provisional scope                                             |
| ---- | ------- | ------------------------------------------------------------- |
| 37.1 | PLANNED | Customer ordering domain foundation                           |
| 37.2 | PLANNED | Public menu and availability APIs                             |
| 37.3 | PLANNED | Customer cart and draft order APIs                            |
| 37.4 | PLANNED | Customer authentication and guest session foundation          |
| 37.5 | PLANNED | Customer app foundation UI                                    |
| 38.1 | PLANNED | QR table session foundation                                   |
| 38.2 | PLANNED | Table self-service ordering APIs                              |
| 38.3 | PLANNED | Staff review and order injection                              |
| 38.4 | PLANNED | QR ordering customer UI                                       |
| 38.5 | PLANNED | QR ordering administration UI                                 |
| 39.1 | PLANNED | Fulfillment method and policy foundation                      |
| 39.2 | PLANNED | Customer address and zone management                          |
| 39.3 | PLANNED | Delivery and pickup order lifecycle                           |
| 39.4 | PLANNED | Fulfillment capacity and time slots                           |
| 39.5 | PLANNED | Fulfillment customer and admin UI                             |
| 40   | PLANNED | Advanced reservations, waitlist, and guest seating            |
| 41   | PLANNED | Purchase requisitions, approvals, and procurement policies    |
| 42   | PLANNED | Vendor invoices, payable reconciliation, and purchase costing |
| 43   | PLANNED | Central kitchen, commissary production, and outlet dispatch   |
| 44   | PLANNED | Stock counts, wastage approvals, and variance workflows       |
| 45   | PLANNED | Demand forecasting and replenishment recommendations          |
| 46   | PLANNED | Payroll foundation and compensation records                   |
| 47   | PLANNED | Leave, availability, scheduling, and approval workflows       |
| 48   | PLANNED | Tips, incentives, commissions, and allocation rules           |
| 49   | PLANNED | Customer segmentation, consent, and lifecycle cohorts         |
| 50   | PLANNED | Campaign management and marketing automation foundation       |
| 51   | PLANNED | Wallet, gift cards, stored value, and liability ledger        |

## Platform Administration

| Task | Status  | Provisional scope                                         |
| ---- | ------- | --------------------------------------------------------- |
| 52   | PLANNED | Super-admin tenant lifecycle portal                       |
| 53   | PLANNED | Subscription billing, invoicing, and collections          |
| 54   | PLANNED | Feature entitlements, usage limits, and metering          |
| 55   | PLANNED | Support cases and audited tenant impersonation            |
| 56   | PLANNED | Platform analytics and operational health dashboards      |
| 57   | PLANNED | Feature flags and staged rollout controls                 |
| 58   | PLANNED | White-label branding and custom domains                   |
| 59   | PLANNED | Franchise hierarchy, policy inheritance, and overrides    |
| 60   | PLANNED | Localization, language, regional formats, and translation |

## Security, Reliability, and Operations

| Task | Status  | Provisional scope                                             |
| ---- | ------- | ------------------------------------------------------------- |
| 61   | PLANNED | Security hardening and threat-model remediation               |
| 62   | PLANNED | MFA, step-up authentication, and recovery                     |
| 63   | PLANNED | Enterprise SSO and identity federation                        |
| 64   | PLANNED | API keys, service accounts, and scoped machine access         |
| 65   | PLANNED | Rate limiting, abuse prevention, and account lockout          |
| 66   | PLANNED | Secrets, environment configuration, and key rotation          |
| 67   | PLANNED | Privacy, retention, deletion, and data export controls        |
| 68   | PLANNED | PostgreSQL backup, restore, and verification automation       |
| 69   | PLANNED | Disaster recovery and business continuity runbooks            |
| 70   | PLANNED | Structured logging, metrics, tracing, and alerting            |
| 71   | PLANNED | PM2 process management and worker topology                    |
| 72   | PLANNED | Nginx TLS, static hosting, proxy, and Socket.IO configuration |
| 73   | PLANNED | Ubuntu VPS provisioning and production hardening              |
| 74   | PLANNED | CI quality gates and automated validation                     |
| 75   | PLANNED | Release, migration, rollback, and change-management process   |
| 76   | PLANNED | API and Flutter performance optimization                      |
| 77   | PLANNED | PostgreSQL query, index, partition, and archive optimization  |
| 78   | PLANNED | Automated tenant-isolation and RLS verification suite         |
| 79   | PLANNED | Load, stress, soak, and capacity testing                      |
| 80   | PLANNED | Accessibility and responsive-design compliance                |

## Product Completion and Scale

| Task | Status  | Provisional scope                                             |
| ---- | ------- | ------------------------------------------------------------- |
| 81   | PLANNED | Restaurant mobile release readiness                           |
| 82   | PLANNED | Admin web production readiness                                |
| 83   | PLANNED | Customer mobile/web production readiness                      |
| 84   | PLANNED | Kitchen display deployment and device hardening               |
| 85   | PLANNED | Thermal printer, cash drawer, and peripheral integrations     |
| 86   | PLANNED | Payment gateway adapters and settlement reconciliation        |
| 87   | PLANNED | Fiscal device and government tax integrations                 |
| 88   | PLANNED | Accounting export and ERP integration                         |
| 89   | PLANNED | Marketplace and delivery aggregator integrations              |
| 90   | PLANNED | Advanced BI datasets and governed analytics exports           |
| 91   | PLANNED | Scheduled reports and report distribution                     |
| 92   | PLANNED | Data import, migration, and tenant onboarding toolkit         |
| 93   | PLANNED | Sandbox/demo tenant lifecycle and sales enablement            |
| 94   | PLANNED | Automated end-to-end critical workflow suite                  |
| 95   | PLANNED | Security audit and penetration-test remediation               |
| 96   | PLANNED | Financial, inventory, loyalty, and audit reconciliation suite |
| 97   | PLANNED | Operational runbooks, support tooling, and incident response  |
| 98   | PLANNED | Pilot rollout, telemetry review, and stabilization            |
| 99   | PLANNED | Production launch checklist and go-live rehearsal             |
| 100  | PLANNED | General availability readiness review                         |
