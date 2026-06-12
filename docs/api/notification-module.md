# Notification Center API

All endpoints require JWT authentication. Tenant users receive tenant context
from the authenticated session; platform administrators must explicitly select
the target tenant for administrative calls.

## Inbox

- `GET /notifications` supports pagination, unread, category, priority, and
  search filters.
- `GET /notifications/unread-count` returns the current user's active unread
  count.
- `GET /notifications/:id` returns only a notification delivered to the
  current user.
- `PATCH /notifications/:id/read` marks one delivered notification read.
- `POST /notifications/read-all` marks the current user's delivered
  notifications read.

## Preferences

- `GET /notifications/preferences` returns every supported category, defaulting
  missing rows to enabled.
- `PATCH /notifications/preferences` upserts the supplied category settings.
- Mandatory notifications bypass disabled preferences.

## Administration

- `POST /notifications/admin` publishes a `USER`, `TENANT`, or `OUTLET`
  notification and expands the audience to active memberships.
- `GET /notifications/admin` lists authorized publishing history.
- `GET /notifications/admin/:id` includes recipient delivery/read state.

Publishing accepts category, priority, title, body, optional action URL,
mandatory flag, expiry, and audience-specific identifiers.

External provider delivery is intentionally absent and belongs to Task 27.
