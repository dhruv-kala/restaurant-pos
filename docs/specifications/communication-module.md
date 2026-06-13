# Communication Module

## Status

Tasks 27.1 through 27.9 are implemented, including templates, SMTP email,
Twilio SMS and WhatsApp, Firebase push, verified webhook delivery tracking, and
the tenant admin Communication Center with operational analytics.

Task 27 is split into:

* Task 27.1 Communication Infrastructure Foundation
* Task 27.2 Communication Template Management
* Task 27.3 Email Delivery Providers
* Task 27.4 SMS Delivery Providers
* Task 27.5 WhatsApp Delivery Providers
* Task 27.6 Push Notification Delivery
* Task 27.7 Webhooks and Delivery Tracking
* Task 27.8 Communication Center UI
* Task 27.9 Communication Analytics

## Objective

Provide a tenant-isolated, provider-agnostic communication platform for:

* Email
* SMS
* WhatsApp
* Push Notifications

The Communication Module executes message delivery.

The Notification Module determines what should be delivered, to whom, and under which business rules.

Communication handles provider integration, delivery tracking, retries, webhooks, and delivery status synchronization.

## Ownership

* communication templates
* template version history
* provider configuration
* provider selection
* rendered message snapshots
* communication delivery attempts
* delivery status tracking
* retry orchestration
* webhook processing
* delivery analytics
* provider-neutral channel abstractions

Business modules continue to own:

* domain events
* business workflows
* customer segmentation
* loyalty rules
* campaign logic

## Data Model

* `CommunicationProvider`: provider configuration metadata and capabilities
* `CommunicationTemplate`: reusable communication template definition
* `CommunicationTemplateVersion`: immutable version history
* `CommunicationMessage`: rendered outbound communication snapshot
* `CommunicationAttempt`: individual provider delivery attempt
* `CommunicationWebhook`: provider webhook event history

All tenant-owned records carry tenant scope and use forced PostgreSQL row-level security.

Provider secrets must not be stored directly in tenant-editable records.

Task 27.1 implements `CommunicationProvider`, `CommunicationMessage`, and
`CommunicationAttempt` foundations, provider abstraction contracts, delivery
state rules, and idempotent internal enqueueing.

Task 27.2 implements tenant-scoped `CommunicationTemplate` and immutable
`CommunicationTemplateVersion` records, strict scalar placeholder rendering,
preview, protected administration APIs, exact message version references, and
transactional audit events.

Task 27.3 implements SMTP provider execution, environment-backed secret
references, authenticated recipient-address encryption, atomic message
claiming, append-only attempts, SMTP acceptance/failure tracking, protected
message history, and delivery audit events. SMTP acceptance maps to `SENT`.

Task 27.4 implements Twilio SMS execution with E.164 validation, protected
auth-token references, provider privacy options, a shared channel-neutral
delivery executor, append-only attempts, safe failure classification, and SMS
audit events.

Task 27.5 implements Twilio WhatsApp template execution with E.164 channel
addressing, environment-backed auth-token references, immutable internal
template-version to approved Content SID mappings, strict scalar template
variables, and `DELIVERED`/`READ` status application contracts.

Task 27.6 implements Firebase Cloud Messaging HTTP v1 execution,
environment-referenced service-account authentication, encrypted tenant/user
device registrations, immutable push notification/data payloads, append-only
attempt tracking, and automatic invalid-token deactivation. FCM provider
acceptance maps to `SENT`; retries and generalized provider callback handling
remain deferred.

Task 27.7 implements immutable webhook event history, Twilio signature
verification, a signed provider-neutral HMAC envelope, duplicate-event
suppression, and centralized monotonic message/attempt state synchronization.
Supported normalized outcomes are delivered, failed, bounced, complaint, and
WhatsApp read. Raw provider payloads, credentials, and recipient addresses are
not retained.

Task 27.8 implements protected provider administration APIs, shared Dart
communication contracts, a typed Dio client, Riverpod repositories/providers,
and the admin Communication Center for operational totals, templates, message
history, delivery attempts, and provider configuration. Provider credentials
remain environment references; metadata containing embedded credential values
is rejected.

Task 27.9 implements tenant/outlet-scoped communication analytics over
immutable message and webhook history. It provides bounded UTC date filtering,
daily/weekly/monthly trends, terminal delivery success/failure rates, channel
volume and latency, and provider delivery/webhook performance through protected
APIs and the admin Communication Center.

## Invariants

* Business modules never call external providers directly.
* Notification and domain events create communication requests through approved services.
* Communication messages retain immutable rendered content snapshots.
* Template updates create new versions.
* Delivery attempts are append-only.
* Retry operations create new attempts rather than mutating history.
* Provider webhooks never bypass authorization or tenant validation.
* Duplicate delivery is prevented through idempotency controls.
* Provider credentials are never exposed through APIs or logs.
* Communication history cannot be edited after creation.
* Cross-tenant communication access is prohibited.

## Authorization

* All communication access is tenant scoped.
* `SUPER_ADMIN` may inspect communication operations across tenants.
* `TENANT_ADMIN` may manage templates, providers, and communication history within their tenant.
* `MANAGER` may view authorized outlet communication history.
* Communication administration requires explicit permissions.
* Backend authorization is authoritative.

Suggested permissions:

* `COMMUNICATION_VIEW`
* `COMMUNICATION_SEND`
* `COMMUNICATION_TEMPLATE_VIEW`
* `COMMUNICATION_TEMPLATE_MANAGE`
* `COMMUNICATION_PROVIDER_VIEW`
* `COMMUNICATION_PROVIDER_MANAGE`
* `COMMUNICATION_HISTORY_VIEW`

Implemented permission keys use lowercase names:

* `communication.template_view`
* `communication.template_manage`
* `communication.provider_view`
* `communication.provider_manage`
* `communication.analytics_view`
* `communication.history_view`

## API

Provider Management:

* `GET /communication/providers`
* `GET /communication/providers/:id`
* `POST /communication/providers`
* `PATCH /communication/providers/:id`

Template Management:

* `GET /communication/templates`
* `GET /communication/templates/:id`
* `POST /communication/templates`
* `PATCH /communication/templates/:id`
* `GET /communication/templates/:id/versions`

Communication History:

* `GET /communication/messages`
* `GET /communication/messages/:id`
* `GET /communication/messages/:id/attempts`

Push Devices:

* `GET /communication/push/devices`
* `POST /communication/push/devices`
* `DELETE /communication/push/devices/:id`

Webhook Processing:

* `POST /communication/webhooks/:provider`

Communication Analytics:

* `GET /communication/analytics`
* `GET /communication/analytics/summary`
* `GET /communication/analytics/channels`
* `GET /communication/analytics/providers`
* `GET /communication/analytics/trends`

Administrative Actions:

* `POST /communication/messages/:id/resend`

The listed provider, template, history, push-device, attempt, webhook, and
analytics endpoints are available through Task 27.9. Resend remains deferred.

## Flutter

Admin Communication Center:

* communication dashboard
* provider management
* template management
* communication history
* delivery attempt inspection
* resend operations

Restaurant applications consume communication state through Notification and business workflows and do not directly manage provider configuration.

Shared:

* communication models
* repository layer
* typed Dio client
* Riverpod providers

The Communication Center dashboard consumes the dedicated Task 27.9 analytics
API and supports UTC date ranges plus daily, weekly, and monthly trends.

## Delivery Channels

Supported channels:

### Email

Examples:

* password reset
* invoices
* receipts
* subscription notifications

### SMS

Examples:

* OTP
* order updates
* operational alerts

### WhatsApp

Examples:

* order confirmation
* order ready
* loyalty notifications

### Push Notifications

Examples:

* order status
* loyalty updates
* promotions
* operational alerts

## Audit Requirements

Audit events must be generated for:

* provider configuration changes
* template creation
* template updates
* template version creation
* resend operations
* webhook verification failures
* communication administration actions

Sensitive values must never be written to audit logs.

## Non-Goals

* marketing automation
* customer segmentation
* campaign management
* AI-generated communication content
* social media integrations
* CRM workflow orchestration
* notification preference management
* in-app notification delivery

These concerns belong to dedicated modules and are not part of the Communication Module.
