# Webhooks, API Integrations, and Integration Credentials Module

## Status

Planned. Task 36 should establish integration credentials and webhook
foundations without implementing marketplace-specific integrations.

Task 36 is split into:

* Task 36.1 Integration Registry and Credential References
* Task 36.2 Outbound Webhook Subscriptions
* Task 36.3 Inbound Webhook Verification Foundation
* Task 36.4 API Key and Integration Access Controls
* Task 36.5 Integration Administration UI

## Objective

Provide a tenant-safe integration foundation for outbound webhooks, inbound
webhook verification, API integration credentials, and future partner
connectors.

## Ownership

This module owns:

* integration registry metadata
* credential references and rotation metadata
* outbound webhook subscriptions
* webhook delivery history
* inbound webhook verification records
* API integration access controls

Business modules own the events and commands exposed through integrations.

## Data Model

Planned entities:

* `IntegrationProvider`: platform-defined integration type
* `TenantIntegration`: tenant configuration for an integration
* `IntegrationCredential`: metadata and secret reference, never plaintext
* `OutboundWebhookSubscription`: endpoint, event types, status, signing mode
* `OutboundWebhookDelivery`: append-only delivery attempt history
* `InboundWebhookEvent`: verified inbound event history
* `IntegrationApiKey`: hashed key metadata and scope assignments

All tenant integration rows carry `tenantId`. Outlet-specific integrations
carry `outletId` when the provider configuration applies to one outlet.

## Scope Rules

Configuration hierarchy:

Platform provider catalog -> tenant integration default -> outlet override.

Offline support classification: server-only. Offline clients must synchronize
through approved APIs before integrations are triggered.

## Invariants

* Plaintext credentials are never stored in tenant-editable records.
* Webhook payload history is sanitized.
* Outbound delivery attempts are append-only.
* Inbound webhooks require signature or equivalent verification.
* Replay protection is required where the provider supports timestamps.
* Integration API keys are hashed and shown only once.
* Tenant isolation applies to subscriptions, events, credentials, and keys.

## Authorization

Suggested permissions:

* `integrations.view`
* `integrations.manage`
* `integrations.credentials_manage`
* `integrations.webhooks_manage`
* `integrations.api_keys_manage`

Platform admins manage provider catalog entries. Tenant admins manage tenant
integration configuration.

## API

Planned APIs:

* `GET /integrations/providers`
* `GET /integrations`
* `POST /integrations`
* `PATCH /integrations/:id`
* `GET /integrations/:id/credentials`
* `POST /integrations/:id/credentials`
* `POST /integrations/:id/credentials/:credentialId/rotate`
* `GET /webhook-subscriptions`
* `POST /webhook-subscriptions`
* `PATCH /webhook-subscriptions/:id`
* `GET /webhook-deliveries`
* `POST /webhooks/inbound/:provider`
* `GET /integration-api-keys`
* `POST /integration-api-keys`
* `POST /integration-api-keys/:id/revoke`

## Flutter

Admin UI:

* integration list
* credential reference setup
* outbound webhook subscription management
* delivery history
* API key creation and revocation

Restaurant-app has no direct UI requirement.

## Audit Requirements

Audit:

* integration enable/disable
* credential create and rotate
* webhook subscription changes
* API key creation and revocation
* inbound verification failures

## Non-Goals

* individual marketplace connectors
* accounting export formats
* delivery aggregator order ingestion
* payment gateway settlement
* arbitrary script execution
