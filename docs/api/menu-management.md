# Menu Management API

All endpoints are under `/api/v1`, require bearer authentication, and use the
Swagger `Menu` tag. Allowed roles are `SUPER_ADMIN`, `TENANT_ADMIN`, and
`MANAGER`. Tenant scope comes from the JWT. Platform administrators provide
`tenantId` for writes and may filter lists by tenant.

## Categories

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/menu/categories` | Create a category |
| `GET` | `/menu/categories` | List categories |
| `GET` | `/menu/categories/:id` | Read a category |
| `PATCH` | `/menu/categories/:id` | Update a category |
| `DELETE` | `/menu/categories/:id` | Soft-delete an empty category |

Categories support hierarchy, display order, active state, search, and
pagination. Cross-tenant parents and hierarchy cycles are rejected.

## Menu Items

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/menu/items` | Create an item with nested configuration |
| `GET` | `/menu/items` | Search and paginate items |
| `GET` | `/menu/items/:id` | Read an item |
| `PATCH` | `/menu/items/:id` | Update an item |
| `DELETE` | `/menu/items/:id` | Soft-delete an item |
| `POST` | `/menu/items/:id/variants` | Add a variant |
| `GET` | `/menu/items/:id/variants` | List variants |
| `DELETE` | `/menu/variants/:id` | Delete a variant |
| `POST` | `/menu/items/:id/addons` | Add an add-on |
| `GET` | `/menu/items/:id/addons` | List add-ons |
| `DELETE` | `/menu/addons/:id` | Delete an add-on |

Lists accept `page`, `limit`, `search`, `categoryId`, `isAvailable`, `sortBy`,
and `sortDirection`. Responses use `data` and pagination `meta`.

Prices are integer minor units. `taxPercentage` accepts values from zero through
100 with up to two decimal places.
