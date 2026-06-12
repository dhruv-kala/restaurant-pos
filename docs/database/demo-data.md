# Development Demo Data

Demo data is non-production bootstrap data for development, test, and explicitly
enabled staging environments.

## Tenant And Outlet

- Tenant: `Demo Restaurant`
- Slug: `demo-restaurant`
- Outlet: `Main Branch`
- Outlet code: `MAIN`
- Currency: INR
- Timezone: Asia/Kolkata

## Users

Development password for all demo users: `ChangeMe@123`

| User | Role |
|---|---|
| `admin@demo.com` | TENANT_ADMIN |
| `manager@demo.com` | MANAGER |
| `cashier@demo.com` | CASHIER |
| `waiter@demo.com` | WAITER |
| `kitchen@demo.com` | KITCHEN_STAFF |
| `inventory@demo.com` | INVENTORY_MANAGER |
| `hr@demo.com` | HR_MANAGER |

Passwords are bcrypt hashes in the database. Demo users are never created by a
production seed.

## Operational Data

- 20 dining tables with mixed capacities of 2, 4, 6, and 8
- Five kitchen stations: Main Kitchen, Tandoor, Bar, Dessert, and Bakery
- Four menu categories and seven menu items
- Eight inventory categories and eight units of measure
- Eight stocked ingredients
- Five sample menu recipes
- 20 customers with one to four completed demo visits and varied spend

Customer history uses deterministic completed orders and immutable visit rows
so reporting screens have coherent source data rather than fabricated aggregate
totals.
