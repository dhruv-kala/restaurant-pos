# Menu Module Specification

## Scope

Task 11 provides hierarchical categories, menu items, images, base and cost
prices, dietary flags, availability, tax percentages, variants, add-ons, and
outlet price overrides. It does not implement ordering, recipes, inventory
deduction, promotions, scheduled prices, or customer publishing.

## Authorization

`SUPER_ADMIN`, `TENANT_ADMIN`, and `MANAGER` may administer menus. Cashier,
waiter, kitchen staff, and customer roles are denied. Backend authorization is
authoritative.

## Business Rules

1. Every menu record belongs to one tenant.
2. Parent and item categories belong to the same tenant.
3. Category hierarchies cannot contain cycles.
4. Categories must be empty before deletion.
5. Item and outlet prices are positive integer minor units.
6. At most one active item variant is the default.
7. Outlet overrides reference an outlet from the item tenant.
8. Deletes are soft and increment record versions.
9. Variant, add-on, and outlet-price arrays replace those collections only when
   explicitly included in an item update.

## Flutter Administration

`apps/admin` contains a feature-first menu module with a dashboard, category
list/add/edit screens, item list/add/edit screens, Riverpod
`categoryProvider`/`menuItemsProvider`, and loading, error, empty, search, and
pagination states.
