# Notification Center Module

## Status

Implemented by Task 26 on 2026-06-12.

## Objective

Provide a tenant-isolated in-app notification center for restaurant users,
tenant administrators, and outlet operations without coupling Task 26 to
external communication providers.

Email, SMS, WhatsApp, mobile push, provider webhooks, templates, retries, and
scheduled provider delivery belong to Task 27, the Communication Module.

## Ownership

- immutable notification content snapshots
- direct-user, tenant, and outlet audiences
- per-recipient delivery and read state
- per-user, per-category in-app preferences
- category and priority classification
- administrative publishing history

Business modules continue to own the source event and may call the notification
service only after their business transaction contract is defined.

## Data Model

- `Notification`: immutable title/body, audience, category, priority, optional
  action URL and metadata, tenant/outlet scope, aggregate delivery state
- `NotificationRecipient`: per-user delivered, skipped, read, and archived
  state
- `NotificationPreference`: per-user category opt-in for the in-app channel

All records carry tenant scope and use forced PostgreSQL row-level security.

## Invariants

- Tenant context comes from trusted authentication.
- Direct recipients must be active members of the same tenant.
- Outlet broadcasts resolve only active members assigned to that outlet.
- Managers can publish only outlet and direct-user notifications in their
  authenticated outlet context.
- Notification content is immutable after creation.
- Recipient and preference state may progress without rewriting content.
- Mandatory notices bypass category opt-out.
- Expired notifications do not appear in the active inbox.
- Publishing and preference changes append Audit module events.

## Authorization

- All authenticated tenant users can read their own inbox, mark their own
  notifications read, and manage their own preferences.
- `SUPER_ADMIN` and `TENANT_ADMIN` may publish and inspect authorized tenant
  notifications.
- `MANAGER` may publish and inspect outlet-scoped notifications.
- Granular `notifications.*` permissions support custom roles.
- Backend authorization is authoritative.

## API

User endpoints:

- `GET /notifications`
- `GET /notifications/unread-count`
- `GET /notifications/preferences`
- `PATCH /notifications/preferences`
- `POST /notifications/read-all`
- `GET /notifications/:id`
- `PATCH /notifications/:id/read`

Administrative endpoints:

- `POST /notifications/admin`
- `GET /notifications/admin`
- `GET /notifications/admin/:id`

## Flutter

- Admin Notification Center with inbox and authorized publishing history
- Admin compose flow for tenant, outlet, and direct-user notifications
- Restaurant-app shared repository, providers, unread badge, inbox, detail,
  and mark-read behavior
- Shared models and typed Dio API client

## Non-Goals

- Email, SMS, WhatsApp, or push delivery
- Provider credentials, adapters, or webhooks
- Template rendering and localization
- Marketing campaigns or segmentation
- Durable outbox workers and retry scheduling

These are Task 27 Communication Module concerns.
