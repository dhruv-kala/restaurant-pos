# Kitchen Display System Specification

## Workflow

```text
Order item fired
  -> PENDING
  -> PREPARING
  -> READY
  -> SERVED
```

Item transitions record durable timestamps. Aggregate order status is derived
from item state and advances using the shared order lifecycle. Bulk actions use
the same item transitions.

## Kitchen Routing

```text
Menu Item
  -> active Kitchen Category for the order outlet
  -> Order Item route snapshot
  -> filtered station queue
```

Example stations include Main Kitchen, Tandoor, Bar, Dessert, and Bakery.
Unrouted items remain visible in the all-stations queue.

## SLA

Preparation duration is `readyAt - startedAt`. While active, elapsed time uses
`startedAt`, or `firedAt` before preparation begins.

- `ON_TIME`: elapsed or actual minutes are at or below estimate.
- `AT_RISK`: above estimate but no more than 20 percent.
- `DELAYED`: more than 20 percent above estimate.

Actual duration, ready time, station, and SLA classification are available for
future kitchen performance and forecasting analytics.

## Priority

- `NORMAL`: default presentation.
- `HIGH`: orange.
- `VIP`: red.

Queue ordering is priority descending, then oldest order first.

## Realtime Readiness

No Socket.IO transport is implemented. Typed `OrderStarted`, `OrderReady`,
`OrderServed`, and `KitchenQueueUpdated` events are published through a no-op
service boundary that can later be connected to durable events and sockets.
Flutter uses invalidatable Riverpod providers and manual refresh, without
polling-specific state.

## Flutter Access

- Kitchen staff: queue actions and all views.
- Manager: view queue, ready, and completed.
- Waiter: ready view only.
- Cashier and customer: no KDS routes.
