# Table Management API

All endpoints are under `/api/v1`, require bearer authentication, and use the
Swagger `Tables` tag.

`SUPER_ADMIN`, `TENANT_ADMIN`, and `MANAGER` may write. `WAITER` and `CASHIER`
have read access. Kitchen and customer roles are denied. Manager, waiter, and
cashier requests are restricted to the outlet in their authenticated
membership; tenant and platform administrators may provide an outlet scope.

## Sections And Tables

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/table-sections` | Create a section |
| `GET` | `/table-sections` | List sections |
| `GET` | `/table-sections/:id` | Read a section |
| `PATCH` | `/table-sections/:id` | Update a section |
| `DELETE` | `/table-sections/:id` | Soft-delete an empty section |
| `POST` | `/tables` | Create a dining table |
| `GET` | `/tables` | List dining tables |
| `GET` | `/tables/:id` | Read a dining table |
| `PATCH` | `/tables/:id` | Update a dining table |
| `PATCH` | `/tables/:id/status` | Change table status |
| `DELETE` | `/tables/:id` | Soft-delete a dining table |

Lists support `page`, `limit`, `search`, `tenantId`, `outletId`, `sectionId`,
and table `status` as applicable.

## Operations

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/tables/merge` | Merge available tables |
| `POST` | `/tables/split` | Split an active merge |
| `POST` | `/tables/transfer` | Transfer occupancy to an available table |

Merge accepts `tableIds`; the first table is primary and remaining tables
become `OUT_OF_SERVICE` until split. Transfer requires an `OCCUPIED` source and
an `AVAILABLE` target in the same tenant and outlet.

## Reservations

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/reservations` | Create a future reservation |
| `GET` | `/reservations` | List reservations |
| `GET` | `/reservations/:id` | Read a reservation |
| `PATCH` | `/reservations/:id` | Update a reservation |
| `PATCH` | `/reservations/:id/status` | Advance reservation status |
| `DELETE` | `/reservations/:id` | Cancel and soft-delete a reservation |

Reservation lists support status, date, search, and tenant/outlet scope.
Transitions are `PENDING -> CONFIRMED|CANCELLED`,
`CONFIRMED -> SEATED|CANCELLED|NO_SHOW`, and `SEATED -> COMPLETED`.
