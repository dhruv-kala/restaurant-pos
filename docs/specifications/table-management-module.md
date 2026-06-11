# Table Management Module Specification

## Scope

Task 12 provides outlet sections, dining table layout metadata, operational
statuses, reservations, table merge/split, and occupancy transfer. It does not
create orders, seating assignments, floor-plan drag persistence, waitlists, or
real-time Socket.IO events.

## Authorization

- `SUPER_ADMIN`, `TENANT_ADMIN`, and `MANAGER`: read and write.
- `WAITER` and `CASHIER`: read only.
- Kitchen, customer, and unrecognized roles: denied.
- Operational users are locked to their authenticated outlet.
- PostgreSQL RLS remains the final tenant isolation boundary.

## Business Rules

1. Tables and sections must belong to the same tenant and outlet.
2. A section cannot be deleted while it contains active tables.
3. Reserved guest count cannot exceed table capacity.
4. Reservations must be in the future when created.
5. Reservation status follows the documented forward-only state machine.
6. Confirming, seating, completing, cancelling, or marking no-show updates the
   associated table status transactionally.
7. Only available tables can be merged.
8. Only an occupied source can transfer to an available target.
9. Merge, split, transfer, and reservation status changes are atomic.

## Flutter Administration

`apps/admin` includes Riverpod repositories/providers, a visual table layout,
table and section administration, reservation list/add/edit forms, and
Menu/Tables top-level navigation. Writes requiring explicit scope use the
compile-time `OUTLET_ID`; API location continues to use `API_BASE_URL`.
