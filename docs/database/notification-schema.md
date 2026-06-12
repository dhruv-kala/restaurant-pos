# Notification Center Database Schema

Migration:
`backend/api/prisma/migrations/20260613220000_add_notification_center/migration.sql`

## Tables

- `notifications`: immutable content and aggregate in-app delivery state
- `notification_recipients`: per-user delivery, read, and archive state
- `notification_preferences`: per-user category preference

## Isolation And Integrity

- Every row is tenant scoped.
- Composite tenant foreign keys prevent cross-tenant notification references.
- Outlet notifications use tenant-aware outlet foreign keys.
- Forced RLS applies to all three tables.
- Audience checks require an outlet only for `OUTLET` notifications.
- Delivery timestamps must agree with delivered status.
- Expiry must be later than creation.
- Notification content and deletes are rejected by database triggers.

Indexes support tenant publishing history, outlet history, category/priority
filtering, user unread inboxes, recipient delivery summaries, and preference
lookup.
