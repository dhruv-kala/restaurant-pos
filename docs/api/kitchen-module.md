# Kitchen Module API

Base path: `/api/v1/kitchen`

All endpoints require a bearer access token and are documented under the
Swagger `Kitchen` tag.

## Authorization

| Role | Queue and metrics | Item/order transitions | Station configuration |
|---|---:|---:|---:|
| `SUPER_ADMIN` | Yes, explicit scope | Yes | Yes |
| `TENANT_ADMIN` | Own tenant | Yes | Yes |
| `MANAGER` | Own outlet | Yes | Yes |
| `KITCHEN_STAFF` | Own outlet | Yes | No |
| `WAITER` | Own outlet, read-only | No | No |
| `CASHIER` | Own outlet, read-only | No | No |

Tenant and outlet scope come from authenticated membership. Request identifiers
are validated within forced PostgreSQL RLS transactions.

## Station Endpoints

- `POST /kitchen/stations`
- `GET /kitchen/stations`
- `PATCH /kitchen/stations/:id`
- `DELETE /kitchen/stations/:id`

Station create and update contracts support name, code, display order, active
state, outlet scope, and menu-item assignments. Deletion is a soft delete and
is rejected while active order items still reference the station.

## Queue And Metrics

- `GET /kitchen/queue`
- `GET /kitchen/metrics`

Queue filters include `stationId`, priority, status, and search. The projection
returns order, table, waiter, item, station, priority, elapsed time, remaining
time, and SLA state. Results are priority-first and oldest-first with a bounded
maximum suitable for 1000 active orders.

Metrics provide average preparation time, completed order/item counts, and
delayed order/item counts. They are an operational foundation, not a reporting
warehouse.

## Status Endpoints

- `PATCH /kitchen/items/:id/status`
- `PATCH /kitchen/orders/:id/status`

Item lifecycle:

```text
PENDING -> PREPARING -> READY -> SERVED
```

Order kitchen lifecycle:

```text
PENDING -> ACCEPTED -> PREPARING -> READY -> SERVED -> COMPLETED
```

The service inserts the existing `ACCEPTED` domain state when moving a pending
order into preparation. Item transitions record timestamps, acting users, and
actual preparation duration. Order state is synchronized transactionally from
its items.

## Realtime Contract

Socket.IO namespace: `/kitchen`

Client events:

- `subscribeKitchenQueue`
- `subscribeOrderUpdates`

Server events:

- `KitchenQueueUpdated`
- `OrderCreated`
- `OrderUpdated`
- `OrderReady`
- `OrderServed`
- `ItemReady`
- `ItemServed`

Rooms use `tenant:<id>`, `outlet:<id>`, and `station:<id>`. Access tokens are
verified during the handshake. Operational users join only their authorized
outlet; tenant admins may join their tenant room; super admins must explicitly
subscribe to a validated target. Station subscriptions are checked under RLS.
