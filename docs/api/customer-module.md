# Customer Module API

All endpoints use `/api/v1`, JWT bearer authentication, trusted tenant context,
and forced database row-level security.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/customers` | Create customer |
| `GET` | `/customers` | Paginated/filterable directory |
| `GET` | `/customers/search` | POS phone/name/email lookup |
| `GET` | `/customers/dashboard` | Customer segment totals |
| `GET` | `/customers/:id` | Customer detail |
| `PATCH` | `/customers/:id` | Update customer |
| `DELETE` | `/customers/:id` | Soft-delete customer |
| `POST/GET` | `/customers/:id/addresses` | Create/list addresses |
| `PATCH/DELETE` | `/customers/addresses/:addressId` | Update/delete address |
| `POST/GET` | `/customers/:id/notes` | Append/list notes |
| `GET` | `/customers/:id/orders` | Order history |
| `GET` | `/customers/:id/bills` | Bill history |
| `GET` | `/customers/:id/payments` | Payment history |
| `GET` | `/customers/:id/visits` | Visit history |
| `GET` | `/customers/:id/stats` | Spend and repeat statistics |

Filters include page, limit, search, phone, email, status, customer type,
source, and date range.

Tenant admins and managers have management access. Cashiers may create, search,
and update. Waiters may create/search and add operational notes. Kitchen and
customer roles are denied; customer self-profile access requires a later
identity contract.
