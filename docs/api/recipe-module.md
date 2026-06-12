# Recipe Module API

All routes use the `/api/v1` prefix, require JWT bearer authentication, and
derive tenant/outlet authorization from the authenticated membership.

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/recipes` | Create a menu-item or variant recipe |
| `GET` | `/recipes` | List recipes with pagination and search |
| `GET` | `/recipes/:id` | Read recipe composition |
| `PATCH` | `/recipes/:id` | Update a recipe |
| `DELETE` | `/recipes/:id` | Soft-delete a recipe |
| `GET` | `/recipes/:id/ingredients` | List ingredients |
| `POST` | `/recipes/:id/ingredients` | Add an ingredient |
| `PATCH` | `/recipes/ingredients/:ingredientId` | Update an ingredient |
| `DELETE` | `/recipes/ingredients/:ingredientId` | Delete an ingredient |
| `PATCH` | `/recipes/:id/ingredients/:ingredientId` | Update an ingredient |
| `DELETE` | `/recipes/:id/ingredients/:ingredientId` | Delete an ingredient |
| `GET` | `/recipes/:id/cost` | Calculate and snapshot current cost |
| `GET` | `/recipes/profitability` | List price, cost, profit, and margins |
| `POST` | `/production-recipes` | Create a semi-finished-goods recipe |
| `GET` | `/production-recipes` | List production recipes |
| `PATCH` | `/production-recipes/:id` | Update a production recipe |
| `GET` | `/consumption` | List immutable consumption history |
| `GET` | `/consumption/:id` | Read one consumption record |
| `POST` | `/inventory/wastage` | Record wastage and stock movement |
| `GET` | `/inventory/wastage` | List immutable wastage history |

Allowed roles are `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER`,
`INVENTORY_MANAGER`, and `KITCHEN_MANAGER`. A stock shortage returns `409` when
the outlet disallows negative stock. Consumption mutations are internal to the
order/kitchen lifecycle transaction.
