# Kitchen Display System API

All endpoints are under `/api/v1/kds`, require bearer authentication, and use
the Swagger `KDS` tag.

## Dashboard

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/kds/queue` | Filter pending through ready kitchen tickets |
| `GET` | `/kds/active` | Pending, accepted, and preparing tickets |
| `GET` | `/kds/ready` | Ready tickets for handoff |
| `GET` | `/kds/completed` | Served and completed ticket history |

Queue filters are `tenantId`, `outletId`, `kitchenCategoryId`, `priority`,
`status`, and order-number `search`.

## Preparation Actions

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/kds/items/:id/start` | Set item preparing and record `startedAt` |
| `POST` | `/kds/items/:id/ready` | Set item ready and calculate prep duration |
| `POST` | `/kds/items/:id/served` | Set item served and record handoff time |
| `POST` | `/kds/orders/:id/start` | Start every pending item in an order |
| `POST` | `/kds/orders/:id/ready` | Mark every preparing item ready |

`start` accepts an optional `estimatedPrepMinutes` override. Item changes
derive the aggregate order status transactionally and use the shared order
lifecycle rules.

## Stations

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/kds/categories` | List outlet kitchen stations |
| `POST` | `/kds/categories` | Create a station |
| `PATCH` | `/kds/categories/:id` | Update station name, order, or active state |

Menu items may reference a default kitchen category. New order items snapshot
that route only when the category belongs to the order outlet and is active.

## Authorization

- Platform and tenant administrators: read, preparation updates, configuration.
- Kitchen staff: own-outlet read and preparation updates.
- Managers: own-outlet view only.
- Waiters: ready orders only.
- Cashiers and customers: denied.
